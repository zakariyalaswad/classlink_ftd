import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AssignmentItem,
  ClassItem,
  ClassSettings,
  Modal,
  Notice,
  Role,
  Tab,
  View,
} from '../models/classlink.models';
import { AuthService } from './auth.service';
import { AssignmentService } from './assignment.service';
import { ClassroomService } from './classroom.service';
import { NotificationService } from './notification.service';
import { STUDENTS } from '../data/demo-data';
import { stored } from '../utils/local-store';

@Injectable({ providedIn: 'root' })
export class ClassLinkStateService {
  private readonly auth = inject(AuthService);
  private readonly classrooms = inject(ClassroomService);
  private readonly assignments = inject(AssignmentService);
  private readonly notifications = inject(NotificationService);

  readonly view = signal<View>('dashboard');
  readonly tab = signal<Tab>('fil');
  readonly modal = signal<Modal>(null);
  readonly search = signal('');
  readonly filter = signal('Tous');
  readonly toast = signal('');
  readonly comment = signal('');
  readonly comments = signal<string[]>(['Très clair, merci !']);
  readonly selectedStudent = signal(STUDENTS[0]!);
  readonly noticeOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly joinCode = signal('');
  readonly muted = signal(false);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly role = this.auth.role;
  readonly settings = this.classrooms.settings;
  readonly notices = this.notifications.notices;
  readonly submitted = this.assignments.submitted;
  readonly answer = this.assignments.answer;
  readonly grade = this.assignments.grade;
  readonly feedback = this.assignments.feedback;

  readonly filteredClasses = computed(() => {
    const q = this.search().toLowerCase();
    return this.classrooms.classes().filter((c) => c.title.toLowerCase().includes(q));
  });

  readonly filteredWork = computed(() => {
    const filter = this.filter();
    const q = this.search().toLowerCase();
    return this.assignments
      .assignments()
      .filter((a) => (filter === 'Tous' || a.type === filter) && a.title.toLowerCase().includes(q));
  });

  readonly unreadCount = computed(() => this.notices().filter((n) => !n.read).length);

  constructor() {
    this.muted.set(this.classrooms.getMuted(this.role()));
    this.notifications.loadForRole(this.role());
  }

  notify(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2600);
  }

  switchRole(next: Role): void {
    this.notifications.persistForRole(this.role());
    this.auth.switchRole(next);
    this.muted.set(this.classrooms.getMuted(next));
    this.notifications.loadForRole(next);
  }

  openClass(classRole: string): void {
    this.switchRole(classRole as Role);
    this.view.set('class');
    this.tab.set('fil');
  }

  setClassMuted(value: boolean): void {
    this.muted.set(value);
    this.classrooms.setMuted(this.role(), value);
  }

  openNotice(notice: Notice): void {
    this.notifications.markRead(notice.id);
    this.notifications.persistForRole(this.role());
    this.noticeOpen.set(false);
    this.view.set(notice.target === 'assignment' ? 'assignment' : 'class');
  }

  addGradeNotice(): void {
    const studentMuted = stored('classlink-muted-étudiant-1', false);
    this.notifications.pushGradeNotice(this.settings().name, this.grade(), studentMuted);
    void this.assignments.saveGrade(
      1,
      'api-rest',
      this.selectedStudent(),
      this.grade(),
      this.feedback(),
    );
    this.notify('Correction enregistrée et notification envoyée');
  }

  saveSettings(settings: ClassSettings): void {
    if (!settings.name.trim() || !settings.subject.trim()) {
      this.notify('Le nom et la matière sont obligatoires');
      return;
    }
    this.classrooms.saveClassSettings(settings);
    this.notify('Paramètres de la classe enregistrés');
  }

  persistNotices(): void {
    this.notifications.persistForRole(this.role());
  }

  classes(): ClassItem[] {
    return this.classrooms.classes();
  }

  work(): AssignmentItem[] {
    return this.filteredWork();
  }

  updateSettings(partial: Partial<ClassSettings>): void {
    const next = { ...this.settings(), ...partial };
    this.classrooms.saveClassSettings(next);
  }

  toggleArchive(): void {
    const archived = !this.settings().archived;
    this.classrooms.setArchived(archived);
    this.modal.set(null);
    this.notify(archived ? 'Classe archivée' : 'Classe restaurée');
  }

  regenerateCode(): void {
    this.classrooms.regenerateCode();
    this.modal.set(null);
    this.notify('Nouveau code généré');
  }

  async joinWithCode(): Promise<void> {
    const ok = await this.classrooms.joinClass(this.joinCode());
    if (!ok) {
      this.notify('Ce code est invalide ou désactivé');
      return;
    }
    this.modal.set(null);
    this.notify('Vous avez rejoint la classe');
  }

  copyCode(): void {
    const code = this.settings().code;
    void navigator.clipboard?.writeText(code);
    this.notify('Code copié dans le presse-papiers');
  }
}
