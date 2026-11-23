import { computed, effect, inject, Injectable, signal } from '@angular/core';
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

/** Shared app state (classes, deadlines, notifications, active role) loaded from the API. */
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

  /** Classes where the current user holds the selected role (or all classes if none match so demo is never empty when user switches role, or filtered when user has role entries). */
  readonly roleClasses = computed(() => {
    const uid = this.auth.user()?.uid;
    const role = this.viewRole();
    const all = this.classes();
    const map = this.membersByClass();
    if (!uid) return all;
    const matching = all.filter((c) => {
      const list = map[c.id];
      if (!list) return true;
      return list.some((m) => m.utilisateurId === uid && m.role === role);
    });
    return matching;
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const logged = !!this.auth.user() && !!this.auth.profile();
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (logged) {
        void this.refresh();
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

  setRole(role: RoleClasse): void {
    this.viewRole.set(role);
  }

  async refresh(): Promise<void> {
    this.error.set('');
    try {
      const classes = await this.api.getClasses();
      this.classes.set(classes);
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

      // Auto-select role based on user's actual memberships if current viewRole has 0 classes and the other has some
      const uid = this.auth.user()?.uid;
      if (uid && classes.length > 0) {
        const hasTeacher = classes.some((c) => (memberMap[c.id] ?? []).some((m) => m.utilisateurId === uid && m.role === 'ENSEIGNANT'));
        const hasStudent = classes.some((c) => (memberMap[c.id] ?? []).some((m) => m.utilisateurId === uid && m.role === 'ETUDIANT'));
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
      this.notifications.set(
        [...list].sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)),
      );
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

  userRoleInClass(id: string): RoleClasse | null {
    const uid = this.auth.user()?.uid;
    if (!uid) return null;
    const m = (this.membersByClass()[id] ?? []).find((x) => x.utilisateurId === uid);
    return m?.role ?? null;
  }
}
