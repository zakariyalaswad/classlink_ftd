import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AppNotification } from '../core/models';
import { StoreService } from '../core/store.service';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, IconComponent, DatePipe],
  template: `
    <div class="min-h-screen flex bg-[#f5f7fb] text-[#182033]">
      <!-- LEFT SIDEBAR (Fixed full viewport height) -->
      <aside class="fixed inset-y-0 left-0 z-30 w-60 h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between select-none overflow-hidden">
        <div class="flex-1 min-h-0 flex flex-col">
          <!-- ClassLink Logo -> redirects to Accueil (/home) -->
          <div class="h-16 px-5 flex items-center shrink-0">
            <a routerLink="/home" class="flex items-center gap-2.5 group focus:outline-none">
              <span class="w-8 h-8 rounded-lg bg-[#2454d6] text-white font-extrabold text-base flex items-center justify-center shadow-xs group-hover:bg-[#1d46b8] transition-colors">
                C
              </span>
              <span class="text-[19px] font-extrabold tracking-tight text-[#182033]">ClassLink</span>
            </a>
          </div>

          <!-- Main Navigation -->
          <nav class="px-3 mt-2 space-y-1 shrink-0">
            <a
              routerLink="/home"
              routerLinkActive="bg-[#eef3ff] !text-[#2454d6] font-semibold"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <app-icon name="grid" [size]="18" />
              <span>Mes classes</span>
            </a>
            <a
              routerLink="/calendar"
              routerLinkActive="bg-[#eef3ff] !text-[#2454d6] font-semibold"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <app-icon name="calendar" [size]="18" />
              <span>Calendrier</span>
            </a>
          </nav>

          <!-- CLASSES Section (Internal scroll inside fixed sidebar) -->
          <div class="mt-6 px-3 flex-1 min-h-0 flex flex-col">
            <div class="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              CLASSES
            </div>
            <div class="space-y-0.5 flex-1 min-h-0 overflow-y-auto pr-1">
              @if (store.loading() && store.classes().length === 0) {
                <div class="px-3 py-2 flex items-center gap-2 text-xs text-slate-400">
                  <app-icon name="spinner" [size]="14" />
                  <span>Chargement...</span>
                </div>
              } @else {
                @for (c of store.roleClasses(); track c.id) {
                  <a
                    [routerLink]="['/classes', c.id]"
                    routerLinkActive="bg-[#eef3ff] !text-[#2454d6] font-semibold"
                    class="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <span class="w-2.5 h-2.5 rounded-[3px] shrink-0" [class]="store.themeForClass(c.id).dotColor"></span>
                    <span class="truncate">{{ c.nom }}</span>
                  </a>
                } @empty {
                  <p class="px-3 py-2 text-xs text-slate-400">Aucune classe ({{ store.viewRole() === 'ENSEIGNANT' ? 'Enseignant' : 'Étudiant' }})</p>
                }
              }
            </div>
          </div>
        </div>

        <!-- Bottom Archived Courses Card (pinned at bottom of fixed sidebar) -->
        <div class="p-3 shrink-0">
          <a
            routerLink="/archived"
            routerLinkActive="!bg-[#eef3ff] border border-blue-200"
            class="flex items-center gap-3 rounded-2xl bg-[#f5f7fb] hover:bg-[#eef2f9] p-3 transition-colors"
          >
            <span class="w-8 h-8 rounded-xl bg-[#e2e9fb] text-[#2454d6] font-bold text-xs flex items-center justify-center shrink-0">
              <app-icon name="archive" [size]="16" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <p class="text-xs font-bold text-[#182033] leading-tight">Cours archivés</p>
                @if (store.archivedClasses().length > 0) {
                  <span class="text-[10px] font-extrabold bg-[#2454d6] text-white rounded-full px-1.5 py-0.5 leading-none">
                    {{ store.archivedClasses().length }}
                  </span>
                }
              </div>
              <p class="text-[11px] text-slate-500 truncate mt-0.5">Gérer ou restaurer vos cours</p>
            </div>
          </a>
        </div>
      </aside>

      <!-- MAIN COLUMN (offset by fixed w-60 sidebar) -->
      <div class="flex-1 flex flex-col min-w-0 ml-60 min-h-screen">
        <!-- TOP NAVBAR -->
        <header class="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
          <!-- Breadcrumb: ClassLink > Current Page -->
          <div class="flex items-center gap-2 text-sm min-w-0">
            <a routerLink="/home" class="text-slate-400 hover:text-[#2454d6] font-medium transition-colors">ClassLink</a>
            <span class="text-slate-300 select-none">›</span>
            <span class="font-bold text-[#182033] truncate">{{ breadcrumbLabel() }}</span>
          </div>

          <!-- Right Controls: Role Switcher + Notifications + User Account -->
          <div class="flex items-center gap-4">
            <!-- Role Switcher Pill -->
            <div class="bg-[#f1f4f9] rounded-xl p-1 flex items-center gap-1 border border-slate-200/60">
              <button
                type="button"
                (click)="store.setRole('ENSEIGNANT')"
                [disabled]="store.viewRole() === 'ENSEIGNANT'"
                [class]="
                  store.viewRole() === 'ENSEIGNANT'
                    ? 'bg-white text-[#2454d6] font-bold shadow-xs rounded-lg px-3 py-1 text-xs transition-all cursor-default'
                    : 'text-slate-600 hover:text-[#182033] font-medium rounded-lg px-3 py-1 text-xs transition-all'
                "
              >
                Enseignant
              </button>
              <button
                type="button"
                (click)="store.setRole('ETUDIANT')"
                [disabled]="store.viewRole() === 'ETUDIANT'"
                [class]="
                  store.viewRole() === 'ETUDIANT'
                    ? 'bg-white text-[#2454d6] font-bold shadow-xs rounded-lg px-3 py-1 text-xs transition-all cursor-default'
                    : 'text-slate-600 hover:text-[#182033] font-medium rounded-lg px-3 py-1 text-xs transition-all'
                "
              >
                Étudiant
              </button>
            </div>

            <!-- Notification Bell + Popover -->
            <div class="relative">
              <button
                type="button"
                (click)="toggleNotifPopover()"
                class="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <app-icon name="bell" [size]="20" />
                @if (store.unreadCount() > 0) {
                  <span
                    class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white"
                  >
                    {{ store.unreadCount() }}
                  </span>
                }
              </button>

              @if (notifOpen()) {
                <div
                  class="fixed inset-0 z-40"
                  (click)="notifOpen.set(false)"
                ></div>
                <div
                  class="absolute right-0 mt-2 w-96 max-w-[92vw] bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden"
                >
                  <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="font-extrabold text-base text-[#182033]">Notifications</h3>
                    <button
                      type="button"
                      (click)="markAllRead()"
                      [disabled]="markingAllRead() || store.unreadCount() === 0"
                      class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2454d6] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      @if (markingAllRead()) {
                        <app-icon name="spinner" [size]="12" />
                      }
                      <span>{{ markingAllRead() ? 'Traitement...' : 'Tout marquer comme lu' }}</span>
                    </button>
                  </div>
                  <div class="px-4 pt-2.5 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      (click)="notifTab.set('ALL')"
                      [disabled]="notifTab() === 'ALL'"
                      [class]="
                        notifTab() === 'ALL'
                          ? 'bg-[#eef3ff] text-[#2454d6] font-bold text-xs px-3 py-1 rounded-lg cursor-default'
                          : 'text-slate-500 hover:text-slate-800 font-medium text-xs px-3 py-1 rounded-lg'
                      "
                    >
                      Toutes
                    </button>
                    <button
                      type="button"
                      (click)="notifTab.set('UNREAD')"
                      [disabled]="notifTab() === 'UNREAD'"
                      [class]="
                        notifTab() === 'UNREAD'
                          ? 'bg-[#eef3ff] text-[#2454d6] font-bold text-xs px-3 py-1 rounded-lg cursor-default'
                          : 'text-slate-500 hover:text-slate-800 font-medium text-xs px-3 py-1 rounded-lg'
                      "
                    >
                      Non lues
                    </button>
                  </div>
                  <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    @for (n of filteredNotifications(); track n.id) {
                      <button
                        type="button"
                        (click)="openNotification(n)"
                        [disabled]="openingNotifId() !== null"
                        class="w-full text-left px-4 py-3 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-start gap-3"
                        [class.bg-[#f6f9ff]]="!n.dateLecture"
                      >
                        @if (openingNotifId() === n.id) {
                          <span class="mt-1 shrink-0 text-[#2454d6]">
                            <app-icon name="spinner" [size]="13" />
                          </span>
                        } @else {
                          <span
                            class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            [class]="!n.dateLecture ? 'bg-[#2454d6]' : 'bg-transparent'"
                          ></span>
                        }
                        <div class="min-w-0 flex-1">
                          <p class="text-xs font-bold text-[#182033]">{{ n.titre }}</p>
                          @if (n.nomClasse) {
                            <p class="text-[11px] font-semibold text-[#2454d6] mt-0.5">{{ n.nomClasse }}</p>
                          }
                          <p class="text-xs text-slate-600 mt-0.5 line-clamp-2">{{ n.message }}</p>
                          <p class="text-[11px] text-slate-400 mt-1">{{ n.dateCreation | date: 'dd/MM HH:mm' }}</p>
                        </div>
                      </button>
                    } @empty {
                      <p class="p-6 text-center text-xs text-slate-400">Aucune notification.</p>
                    }
                  </div>
                  <div class="p-2.5 border-t border-slate-100 text-center bg-slate-50/50">
                    <a
                      routerLink="/notifications"
                      (click)="notifOpen.set(false)"
                      class="text-xs font-bold text-[#2454d6] hover:underline"
                    >
                      Voir toutes les notifications
                    </a>
                  </div>
                </div>
              }
            </div>

            <!-- User Account Area + Dropdown -->
            <div class="relative">
              <button
                type="button"
                (click)="accountOpen.set(!accountOpen())"
                class="flex items-center gap-2.5 rounded-xl py-1 px-1.5 hover:bg-slate-50 transition-colors text-left"
              >
                <app-avatar [name]="auth.fullName() || 'Camille Dupont'" [photoUrl]="auth.photoUrl()" size="medium" />
                <div class="hidden sm:block leading-tight">
                  <p class="text-xs font-bold text-[#182033]">{{ auth.fullName() || 'Utilisateur' }}</p>
                  <p class="text-[11px] text-slate-500">
                    {{ store.viewRole() === 'ENSEIGNANT' ? 'Enseignant(e)' : 'Étudiant(e)' }}
                  </p>
                </div>
              </button>

              @if (accountOpen()) {
                <div class="fixed inset-0 z-40" (click)="accountOpen.set(false)"></div>
                <div class="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-200/80 py-1.5 z-50">
                  <a
                    routerLink="/settings"
                    (click)="accountOpen.set(false)"
                    class="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <app-icon name="gear" [size]="15" /> Paramètres du profil
                  </a>
                  <button
                    type="button"
                    (click)="logout()"
                    [disabled]="loggingOut()"
                    class="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (loggingOut()) {
                      <app-icon name="spinner" [size]="14" />
                    }
                    <span>{{ loggingOut() ? 'Déconnexion...' : 'Déconnexion' }}</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- PAGE CONTENT -->
        <main class="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
          @if (store.error()) {
            <p class="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{{ store.error() }}</p>
          }
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly notifOpen = signal(false);
  readonly notifTab = signal<'ALL' | 'UNREAD'>('ALL');
  readonly accountOpen = signal(false);
  readonly markingAllRead = signal(false);
  readonly openingNotifId = signal<string | null>(null);
  readonly loggingOut = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly breadcrumbLabel = computed(() => {
    const url = this.currentUrl() || '';
    if (url.startsWith('/classes/')) {
      const id = url.split('/classes/')[1]?.split('?')[0]?.split('/')[0] ?? '';
      return this.store.className(id) || 'Détail de la classe';
    }
    if (url.startsWith('/calendar')) return 'Calendrier';
    if (url.startsWith('/archived')) return 'Cours archivés';
    if (url.startsWith('/notifications')) return 'Notifications';
    if (url.startsWith('/settings')) return 'Paramètres du compte';
    return 'Mes classes';
  });

  readonly filteredNotifications = computed(() => {
    const list = this.store.notifications();
    return this.notifTab() === 'UNREAD' ? list.filter((n) => !n.dateLecture) : list;
  });

  toggleNotifPopover(): void {
    this.notifOpen.update((v) => !v);
  }

  async openNotification(n: AppNotification): Promise<void> {
    if (this.openingNotifId()) return;
    this.openingNotifId.set(n.id);
    try {
      if (!n.dateLecture) {
        await this.api.markRead(n.id).catch(() => undefined);
        await this.store.refreshNotifications();
      }
      this.notifOpen.set(false);
      if (n.lienCible) {
        await this.router.navigateByUrl(n.lienCible);
      } else if (n.classeId) {
        await this.router.navigate(['/classes', n.classeId]);
      }
    } finally {
      this.openingNotifId.set(null);
    }
  }

  async markAllRead(): Promise<void> {
    if (this.markingAllRead()) return;
    this.markingAllRead.set(true);
    try {
      await this.api.markAllRead().catch(() => undefined);
      await this.store.refreshNotifications();
    } finally {
      this.markingAllRead.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      this.accountOpen.set(false);
      await this.auth.logout();
    } finally {
      this.loggingOut.set(false);
    }
  }
}
