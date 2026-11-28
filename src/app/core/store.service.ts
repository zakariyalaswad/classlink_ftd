import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { DataSnapshot, getDatabase, onValue, ref, Unsubscribe } from 'firebase/database';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AppNotification, Classe, Inscription, Publication, RoleClasse } from './models';

export interface ClassTheme {
  bannerBg: string;
  dotColor: string;
  tagColor: string;
  accentText: string;
  accentBg: string;
}

const THEMES: ClassTheme[] = [
  {
    bannerBg: 'bg-gradient-to-r from-[#2454d6] to-[#3b6ef5]',
    dotColor: 'bg-[#2454d6]',
    tagColor: 'text-white/90',
    accentText: 'text-[#2454d6]',
    accentBg: 'bg-blue-50',
  },
  {
    bannerBg: 'bg-gradient-to-r from-[#6d48d9] to-[#865ef6]',
    dotColor: 'bg-[#7c4dff]',
    tagColor: 'text-white/90',
    accentText: 'text-[#6d48d9]',
    accentBg: 'bg-violet-50',
  },
  {
    bannerBg: 'bg-gradient-to-r from-[#d97724] to-[#f08c38]',
    dotColor: 'bg-[#e67e22]',
    tagColor: 'text-white/90',
    accentText: 'text-[#d97724]',
    accentBg: 'bg-orange-50',
  },
  {
    bannerBg: 'bg-gradient-to-r from-[#1d8a64] to-[#27a87c]',
    dotColor: 'bg-[#1d8a64]',
    tagColor: 'text-white/90',
    accentText: 'text-[#1d8a64]',
    accentBg: 'bg-emerald-50',
  },
];

function serializeClassForDiff(c: Classe): string {
  return JSON.stringify({
    id: c.id,
    nom: c.nom,
    description: c.description,
    matiere: c.matiere,
    codeAcces: c.codeAcces,
    archivee: Boolean(c.archivee),
    parametres: c.parametres ?? null,
  });
}

function hasClassesDiff(prev: Classe[], next: Classe[]): boolean {
  if (prev.length !== next.length) return true;
  const prevById = new Map(prev.map((c) => [c.id, serializeClassForDiff(c)]));
  for (const c of next) {
    if (prevById.get(c.id) !== serializeClassForDiff(c)) {
      return true;
    }
  }
  return false;
}

/** Shared app state (classes, deadlines, notifications, active role) with Firebase realtime snapshot sync. */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly classes = signal<Classe[]>([]);
  readonly membersByClass = signal<Record<string, Inscription[]>>({});
  readonly publications = signal<Publication[]>([]);
  readonly notifications = signal<AppNotification[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Active role toggle in the navbar ('ENSEIGNANT' | 'ETUDIANT') */
  readonly viewRole = signal<RoleClasse>('ENSEIGNANT');

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.dateLecture).length);
  readonly assignments = computed(() => this.publications().filter((p) => p.type === 'DEVOIR'));

  /** Active (non-archived) classes where the current user holds the selected role. */
  readonly roleClasses = computed(() => {
    const uid = this.auth.user()?.uid;
    const role = this.viewRole();
    const all = this.classes().filter((c) => !c.archivee);
    const map = this.membersByClass();
    if (!uid) return all;
    return all.filter((c) => {
      const list = map[c.id];
      if (!list) return true;
      return list.some((m) => m.utilisateurId === uid && m.role === role);
    });
  });

  /** Archived classes for the current user (filtered by active role). */
  readonly archivedClasses = computed(() => {
    const uid = this.auth.user()?.uid;
    const role = this.viewRole();
    const all = this.classes().filter((c) => c.archivee);
    const map = this.membersByClass();
    if (!uid) return all;
    return all.filter((c) => {
      const list = map[c.id];
      if (!list) return true;
      return list.some((m) => m.utilisateurId === uid && m.role === role);
    });
  });

  private timer: ReturnType<typeof setInterval> | null = null;
  private fallbackClassPollTimer: ReturnType<typeof setInterval> | null = null;
  private realtimeUnsubscribers: Unsubscribe[] = [];
  private latestClassesSnapshot: Record<string, Classe> | null = null;

  constructor() {
    effect(() => {
      const u = this.auth.user();
      const logged = !!u && !!this.auth.profile();
      this.cleanupTimersAndListeners();
      if (logged && u) {
        void this.refresh();
        this.attachOnSnapshotListeners(u.uid);
        this.timer = setInterval(() => void this.refreshNotifications(), 30000);
      } else {
        this.classes.set([]);
        this.membersByClass.set({});
        this.publications.set([]);
        this.notifications.set([]);
        this.loading.set(true);
      }
    });
  }

  private cleanupTimersAndListeners(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.fallbackClassPollTimer) {
      clearInterval(this.fallbackClassPollTimer);
      this.fallbackClassPollTimer = null;
    }
    for (const unsub of this.realtimeUnsubscribers) {
      try {
        unsub();
      } catch {
        /* ignore cleanup errors */
      }
    }
    this.realtimeUnsubscribers = [];
    this.latestClassesSnapshot = null;
  }

  /**
   * Subscribes to real-time Firebase snapshots on `classes`, `inscriptions`, and `publications`
   * so any modification to a class (name, settings, archive state, access code, members, or posts)
   * updates state immediately when a diff is detected. Falls back cleanly to diff-polling if RTDB
   * client rules restrict direct SDK reads.
   */
  private attachOnSnapshotListeners(uid: string): void {
    if (!this.auth.firebaseApp) {
      return;
    }
    try {
      const db = getDatabase(this.auth.firebaseApp, environment.firebase.databaseURL);

      const onSnapshotError = () => {
        if (!this.fallbackClassPollTimer) {
          this.fallbackClassPollTimer = setInterval(() => void this.syncClassesDiffFromApi(), 10000);
        }
      };

      const unsubClasses = onValue(
        ref(db, 'classes'),
        (snapshot: DataSnapshot) => this.handleClassesSnapshot(snapshot),
        onSnapshotError,
      );

      const unsubInscriptions = onValue(
        ref(db, 'inscriptions'),
        (snapshot: DataSnapshot) => this.handleInscriptionsSnapshot(uid, snapshot),
        onSnapshotError,
      );

      const unsubPublications = onValue(
        ref(db, 'publications'),
        (snapshot: DataSnapshot) => this.handlePublicationsSnapshot(snapshot),
        onSnapshotError,
      );

      this.realtimeUnsubscribers.push(unsubClasses, unsubInscriptions, unsubPublications);
    } catch {
      if (!this.fallbackClassPollTimer) {
        this.fallbackClassPollTimer = setInterval(() => void this.syncClassesDiffFromApi(), 10000);
      }
    }
  }

  private handleClassesSnapshot(snapshot: DataSnapshot): void {
    const raw = (snapshot.val() ?? {}) as Record<string, Classe>;
    this.latestClassesSnapshot = raw;
    const current = this.classes();
    const enrolledIds = new Set(Object.keys(this.membersByClass()));
    const targetIds = enrolledIds.size > 0 ? enrolledIds : new Set(current.map((c) => c.id));
    if (targetIds.size === 0) {
      return;
    }

    const updated: Classe[] = [];
    for (const id of targetIds) {
      if (raw[id]) {
        updated.push(raw[id]);
      }
    }

    if (hasClassesDiff(current, updated)) {
      this.classes.set(updated);
    }
  }

  private handleInscriptionsSnapshot(uid: string, snapshot: DataSnapshot): void {
    const raw = (snapshot.val() ?? {}) as Record<string, Inscription>;
    const allInscriptions = Object.values(raw);
    const myClassIds = new Set(
      allInscriptions.filter((ins) => ins && ins.utilisateurId === uid).map((ins) => ins.classeId),
    );

    const nextMemberMap: Record<string, Inscription[]> = {};
    for (const cid of myClassIds) {
      nextMemberMap[cid] = allInscriptions.filter((ins) => ins && ins.classeId === cid);
    }

    const prevMap = this.membersByClass();
    if (JSON.stringify(prevMap) !== JSON.stringify(nextMemberMap)) {
      this.membersByClass.set(nextMemberMap);

      if (this.latestClassesSnapshot) {
        const nextClasses: Classe[] = [];
        for (const cid of myClassIds) {
          if (this.latestClassesSnapshot[cid]) {
            nextClasses.push(this.latestClassesSnapshot[cid]);
          }
        }
        if (hasClassesDiff(this.classes(), nextClasses)) {
          this.classes.set(nextClasses);
        }
      } else {
        void this.syncClassesDiffFromApi();
      }
    }
  }

  private handlePublicationsSnapshot(snapshot: DataSnapshot): void {
    const raw = (snapshot.val() ?? {}) as Record<string, Publication>;
    const myClassIds = new Set(this.classes().map((c) => c.id));
    if (myClassIds.size === 0) return;

    const nextPubs = Object.values(raw).filter((p) => p && myClassIds.has(p.classeId));
    if (JSON.stringify(this.publications()) !== JSON.stringify(nextPubs)) {
      this.publications.set(nextPubs);
    }
  }

  private async syncClassesDiffFromApi(): Promise<void> {
    try {
      const latest = await this.api.getClasses();
      if (hasClassesDiff(this.classes(), latest)) {
        await this.refresh();
      }
    } catch {
      /* keep current state */
    }
  }

  setRole(role: RoleClasse): void {
    this.viewRole.set(role);
  }

  async refresh(): Promise<void> {
    this.error.set('');
    try {
      const classes = await this.api.getClasses();
      if (hasClassesDiff(this.classes(), classes) || this.classes().length === 0) {
        this.classes.set(classes);
      }
      const [pubs, membersEntries] = await Promise.all([
        Promise.all(classes.map((c) => this.api.getPublications(c.id).catch(() => [] as Publication[]))),
        Promise.all(
          classes.map(async (c) => {
            const m = await this.api.getMembers(c.id).catch(() => [] as Inscription[]);
            return [c.id, m] as const;
          }),
        ),
      ]);
      this.publications.set(pubs.flat());
      const memberMap: Record<string, Inscription[]> = {};
      for (const [cid, list] of membersEntries) {
        memberMap[cid] = list;
      }
      this.membersByClass.set(memberMap);

      const uid = this.auth.user()?.uid;
      if (uid && classes.length > 0) {
        const hasTeacher = classes.some((c) =>
          (memberMap[c.id] ?? []).some((m) => m.utilisateurId === uid && m.role === 'ENSEIGNANT'),
        );
        const hasStudent = classes.some((c) =>
          (memberMap[c.id] ?? []).some((m) => m.utilisateurId === uid && m.role === 'ETUDIANT'),
        );
        if (!hasTeacher && hasStudent) {
          this.viewRole.set('ETUDIANT');
        } else if (hasTeacher && !hasStudent) {
          this.viewRole.set('ENSEIGNANT');
        }
      }

      await this.refreshNotifications();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async refreshNotifications(): Promise<void> {
    try {
      const list = await this.api.getNotifications();
      this.notifications.set([...list].sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)));
    } catch {
      /* keep previous list */
    }
  }

  classById(id: string): Classe | undefined {
    return this.classes().find((c) => c.id === id);
  }

  className(id: string): string {
    return this.classById(id)?.nom ?? '';
  }

  themeForClass(id: string): ClassTheme {
    const idx = this.classes().findIndex((c) => c.id === id);
    return THEMES[(idx >= 0 ? idx : 0) % THEMES.length];
  }

  teacherNameForClass(id: string): string {
    const members = this.membersByClass()[id] ?? [];
    const t = members.find((m) => m.role === 'ENSEIGNANT');
    return t ? `${t.prenomUtilisateur} ${t.nomUtilisateur}`.trim() : 'Enseignant';
  }

  memberCountForClass(id: string): number {
    return (this.membersByClass()[id] ?? []).length;
  }

  async deleteClassPermanently(id: string): Promise<void> {
    await this.api.deleteClass(id);
    await this.refresh();
  }

  async leaveClass(id: string): Promise<void> {
    await this.api.leaveClass(id);
    await this.refresh();
  }
}
