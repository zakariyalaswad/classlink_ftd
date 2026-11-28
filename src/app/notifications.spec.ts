import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';
import { AppNotification, Utilisateur } from './core/models';
import { StoreService } from './core/store.service';
import { NotificationsComponent } from './pages/notifications.component';

describe('ClassLink Notifications System (StoreService & NotificationsComponent)', () => {
  let fixture: ComponentFixture<NotificationsComponent>;
  let component: NotificationsComponent;
  let router: Router;
  let mockNotifications: AppNotification[];
  let apiSpy: jasmine.SpyObj<ApiService>;
  let store: StoreService;

  beforeEach(async () => {
    mockNotifications = [
      {
        id: 'notif-1',
        utilisateurId: 'student-1',
        classeId: 'class-1',
        nomClasse: 'Architecture Logicielle',
        type: 'NOUVEAU_DEVOIR',
        titre: 'Nouveau devoir : TP 1',
        message: 'Un nouveau devoir est disponible.',
        lienCible: '/classes/class-1?tab=WORK',
        dateCreation: '2026-11-28T10:00:00',
        dateLecture: null,
        emailStatus: 'SENT',
        destinataireEmail: 'student@classlink.test',
      },
      {
        id: 'notif-2',
        utilisateurId: 'student-1',
        classeId: 'class-2',
        nomClasse: 'Mathématiques',
        type: 'NOUVELLE_ANNONCE',
        titre: 'Bienvenue en cours',
        message: 'Support disponible.',
        lienCible: '/classes/class-2',
        dateCreation: '2026-11-27T09:00:00',
        dateLecture: '2026-11-27T12:00:00',
        emailStatus: 'SENT',
        destinataireEmail: 'student@classlink.test',
      },
    ];

    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getClasses',
      'getNotifications',
      'markRead',
      'markAllRead',
    ]);
    apiSpy.getClasses.and.resolveTo([]);
    apiSpy.getNotifications.and.callFake(async () => [...mockNotifications]);
    apiSpy.markRead.and.callFake(async (id: string) => {
      mockNotifications = mockNotifications.map((n) =>
        n.id === id ? { ...n, dateLecture: '2026-11-28T11:00:00' } : n,
      );
      return {};
    });
    apiSpy.markAllRead.and.callFake(async () => {
      mockNotifications = mockNotifications.map((n) => ({
        ...n,
        dateLecture: n.dateLecture ?? '2026-11-28T11:00:00',
      }));
      return {};
    });

    const authStub: Partial<AuthService> = {
      user: signal({ uid: 'student-1' } as never),
      profile: signal<Utilisateur | null>({
        id: 'student-1',
        nom: 'Martin',
        prenom: 'Bob',
        email: 'student@classlink.test',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(StoreService);
    fixture.detectChanges();
    await store.refreshNotifications();
    fixture.detectChanges();
  });

  it('retrieves notifications and sorts them newest-first with accurate unread count', () => {
    expect(apiSpy.getNotifications).toHaveBeenCalled();
    expect(store.notifications().length).toBe(2);
    expect(store.notifications()[0].id).toBe('notif-1');
    expect(store.unreadCount()).toBe(1);
  });

  it('renders notifications in the Angular interface for the current user', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nouveau devoir : TP 1');
    expect(text).toContain('Architecture Logicielle');
    expect(text).toContain('Bienvenue en cours');
    expect(text).toContain('1 notification(s) non lue(s)');
  });

  it('marks an unread notification as read and navigates to its target link', async () => {
    const unreadNotif = store.notifications()[0];
    await component.open(unreadNotif);
    fixture.detectChanges();

    expect(apiSpy.markRead).toHaveBeenCalledWith('notif-1');
    expect(store.unreadCount()).toBe(0);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/classes/class-1?tab=WORK');
  });

  it('marks all notifications as read when readAll() is triggered', async () => {
    expect(store.unreadCount()).toBe(1);
    await component.readAll();
    fixture.detectChanges();

    expect(apiSpy.markAllRead).toHaveBeenCalled();
    expect(store.unreadCount()).toBe(0);
  });

  it('handles refresh and surfaces API errors gracefully without losing existing notifications', async () => {
    apiSpy.markAllRead.and.rejectWith(new Error('Serveur injoignable'));
    await component.readAll();
    fixture.detectChanges();

    expect(component.error()).toContain('Serveur injoignable');
    expect(store.notifications().length).toBe(2);

    await component.refresh();
    expect(component.error()).toBe('');
  });
});
