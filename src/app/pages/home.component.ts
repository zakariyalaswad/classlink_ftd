import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { StoreService } from '../core/store.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, FormsModule, IconComponent],
  template: `
    <!-- Top Personal Space Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#2454d6] mb-1">
          ESPACE PERSONNEL
        </p>
        <h1 class="text-3xl font-extrabold text-[#182033] leading-tight">
          Bonjour {{ auth.profile()?.prenom || 'Camille' }},
          <span class="block text-[#2454d6]">prêt(e) à apprendre ?</span>
        </h1>
        <p class="text-sm text-slate-500 mt-1.5">
          Retrouvez vos classes, vos échéances et reprenez là où vous vous étiez arrêté(e).
        </p>
      </div>

      <div class="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          (click)="openJoinModal()"
          [disabled]="joinModalOpen() || joining()"
          class="bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed text-[#182033] border border-slate-200/90 font-bold text-xs rounded-xl px-4 py-2.5 inline-flex items-center gap-2 shadow-2xs transition-colors"
        >
          <app-icon name="plus" [size]="15" /> Rejoindre une classe
        </button>
        @if (store.viewRole() === 'ENSEIGNANT') {
          <button
            type="button"
            (click)="openCreateModal()"
            [disabled]="createModalOpen() || creating()"
            class="bg-[#2454d6] hover:bg-[#1d46b8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl px-4 py-2.5 inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <app-icon name="plus" [size]="15" /> Créer une classe
          </button>
        }
      </div>
    </div>

    <!-- Main 2-column grid: Mes classes (left) + À rendre bientôt (right) -->
    <div class="grid lg:grid-cols-3 gap-6 items-start">
      <!-- Left 2 cols: Mes classes -->
      <div class="lg:col-span-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-lg font-extrabold text-[#182033]">Mes classes</h2>
            <p class="text-xs text-slate-500">
              {{ filteredClasses().length }} classe(s) active(s) ce semestre ({{ store.viewRole() === 'ENSEIGNANT' ? 'Enseignant' : 'Étudiant' }})
            </p>
          </div>
          <!-- Search input -->
          <div class="relative w-full sm:w-64">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <app-icon name="search" [size]="15" />
            </span>
            <input
              type="text"
              [(ngModel)]="search"
              placeholder="Rechercher une classe..."
              class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-[#2454d6]"
            />
          </div>
        </div>

        <!-- Class cards grid -->
        @if (store.loading() && store.classes().length === 0) {
          <div class="bg-white rounded-2xl border border-slate-200/80 p-10 flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-500">
            <app-icon name="spinner" [size]="20" />
            <span>Chargement de vos classes...</span>
          </div>
        } @else {
          <div class="grid sm:grid-cols-2 gap-4">
            @for (c of filteredClasses(); track c.id) {
              <div
                class="group relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col"
                [class.z-20]="menuId() === c.id"
                [class.opacity-70]="archivingId() === c.id"
              >
                <!-- Colored Top Banner -->
                <div
                  class="h-24 p-4 relative flex items-start justify-between text-white rounded-t-2xl cursor-pointer"
                  [class]="store.themeForClass(c.id).bannerBg"
                  (click)="openClass(c.id)"
                >
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-white/90">
                    {{ c.matiere || 'INFORMATIQUE' }}
                  </span>
                  <button
                    type="button"
                    (click)="toggleMenu(c.id, $event)"
                    [disabled]="archivingId() !== null"
                    class="text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg p-0.5 -m-0.5"
                    aria-label="Actions de la classe"
                  >
                    <app-icon [name]="archivingId() === c.id ? 'spinner' : 'more'" [size]="18" />
                  </button>

                  @if (menuId() === c.id) {
                    <div class="fixed inset-0 z-30 cursor-default" (click)="closeMenu($event)"></div>
                    <div
                      class="absolute right-3 top-11 z-40 w-56 bg-white text-[#182033] rounded-xl shadow-lg border border-slate-200/80 py-1.5"
                      (click)="$event.stopPropagation()"
                    >
                      @if (store.viewRole() === 'ENSEIGNANT') {
                        <button
                          type="button"
                          (click)="archive(c.id)"
                          [disabled]="archivingId() !== null"
                          class="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <app-icon [name]="archivingId() === c.id ? 'spinner' : 'archive'" [size]="15" />
                          <span>{{ archivingId() === c.id ? 'Archivage...' : 'Archiver la classe' }}</span>
                        </button>
                      } @else {
                        <button
                          type="button"
                          (click)="leave(c.id)"
                          [disabled]="leaving()"
                          class="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Se déconnecter de la classe
                        </button>
                      }
                    </div>
                  }

                  <!-- Overlapping floating book badge -->
                  <div
                    class="w-10 h-10 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center absolute -bottom-5 right-4"
                    [class]="store.themeForClass(c.id).accentText"
                  >
                    <app-icon name="book" [size]="18" />
                  </div>
                </div>

                <!-- White Body -->
                <div class="p-4 pt-6 flex-1 flex flex-col justify-between">
                  <a [routerLink]="['/classes', c.id]" class="block">
                    <h3 class="font-extrabold text-[15px] text-[#182033] group-hover:text-[#2454d6] transition-colors">
                      {{ c.nom }}
                      @if (c.archivee) {
                        <span class="text-[11px] font-normal text-slate-400">(archivée)</span>
                      }
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                      {{ store.teacherNameForClass(c.id) }}
                    </p>
                  </a>

                  <a
                    [routerLink]="['/classes', c.id]"
                    [queryParams]="{ tab: 'MEMBERS' }"
                    class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 hover:text-[#2454d6]"
                  >
                    <span class="inline-flex items-center gap-1.5">
                      <app-icon name="users" [size]="14" />
                      {{ store.memberCountForClass(c.id) }} membre(s)
                    </span>
                    <span class="text-slate-400 group-hover:text-[#2454d6] transition-all">
                      <app-icon name="arrow" [size]="15" />
                    </span>
                  </a>
                </div>
              </div>
            } @empty {
              <div class="sm:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                <p class="text-sm font-bold text-[#182033]">
                  Aucune classe en mode {{ store.viewRole() === 'ENSEIGNANT' ? 'Enseignant' : 'Étudiant' }}
                </p>
                <p class="text-xs text-slate-500 mt-1">
                  Changez de rôle dans la barre supérieure ou créez / rejoignez une classe.
                </p>
              </div>
            }
          </div>
        }
      </div>

      <!-- Right col: À rendre bientôt -->
      <aside class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-extrabold text-base text-[#182033]">À rendre bientôt</h2>
          <a routerLink="/calendar" class="text-xs font-bold text-[#2454d6] hover:underline">Tout voir</a>
        </div>
        <p class="text-xs text-slate-500 mb-4">Vos prochaines échéances</p>

        <div class="space-y-3">
          @for (d of upcoming(); track d.id; let idx = $index) {
            <a
              [routerLink]="['/classes', d.classeId]"
              class="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <!-- Date badge -->
              <div
                class="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-extrabold leading-none"
                [class]="
                  idx === 0
                    ? 'bg-blue-50 text-[#2454d6]'
                    : idx === 1
                      ? 'bg-violet-50 text-[#6d48d9]'
                      : 'bg-orange-50 text-[#d97724]'
                "
              >
                <span class="text-sm">{{ d.dateLimite | date: 'dd' }}</span>
                <span class="text-[9px] uppercase tracking-wider mt-0.5">{{ d.dateLimite | date: 'MMM' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-[#182033] group-hover:text-[#2454d6] truncate">
                  {{ d.titre }}
                </p>
                <p class="text-[11px] text-slate-500 truncate">{{ store.className(d.classeId) }}</p>
                <p class="text-[11px] font-semibold text-orange-600 mt-0.5 flex items-center gap-1">
                  <app-icon name="clock" [size]="12" />
                  {{ d.dateLimite | date: 'dd/MM, HH:mm' }}
                </p>
              </div>
            </a>
          } @empty {
            <p class="text-xs text-slate-400 py-4 text-center">Aucune échéance à venir.</p>
          }
        </div>
      </aside>
    </div>

    <!-- Modal: Se déconnecter de la classe -->
    @if (leaveTarget(); as t) {
      <div
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        (click)="!leaving() && leaveTarget.set(null)"
      >
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center" (click)="$event.stopPropagation()">
          <div class="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <h3 class="text-lg font-extrabold text-[#182033]">Quitter cette classe ?</h3>
          <p class="text-sm font-bold text-[#2454d6] mt-1">{{ t.nom }}</p>
          <p class="text-xs text-slate-500 mt-3 leading-relaxed">
            Vous n'aurez plus accès aux cours, devoirs et notes de cette classe. Vous pourrez la rejoindre à nouveau avec son code d'accès.
          </p>
          <div class="flex gap-2 mt-6">
            <button
              type="button"
              (click)="leaveTarget.set(null)"
              [disabled]="leaving()"
              class="btn-light flex-1 !text-xs"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="confirmLeave()"
              [disabled]="leaving()"
              class="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl px-4 py-2.5 inline-flex items-center justify-center gap-2 transition-colors"
            >
              @if (leaving()) {
                <app-icon name="spinner" [size]="14" />
              }
              <span>{{ leaving() ? 'Déconnexion...' : 'Oui, quitter' }}</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: Créer une classe -->
    @if (createModalOpen()) {
      <div
        class="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
        (click)="!creating() && createModalOpen.set(false)"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-extrabold text-[#182033]">Créer une classe</h3>
            <button
              type="button"
              (click)="createModalOpen.set(false)"
              [disabled]="creating()"
              class="text-slate-400 hover:text-slate-600 disabled:opacity-40"
            >
              <app-icon name="close" [size]="18" />
            </button>
          </div>
          <form (ngSubmit)="create()" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nom de la classe *</label>
              <input name="nom" [(ngModel)]="nom" [disabled]="creating()" placeholder="Ex: Développement Web" class="input" required />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Matière / Catégorie</label>
              <input name="matiere" [(ngModel)]="matiere" [disabled]="creating()" placeholder="Ex: INFORMATIQUE" class="input" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input name="desc" [(ngModel)]="description" [disabled]="creating()" placeholder="Ex: 2024-2025" class="input" />
            </div>
            @if (modalError()) {
              <p class="text-xs text-red-600">{{ modalError() }}</p>
            }
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" (click)="createModalOpen.set(false)" [disabled]="creating()" class="btn-light">
                Annuler
              </button>
              <button type="submit" class="btn" [disabled]="creating() || !nom.trim()">
                @if (creating()) {
                  <app-icon name="spinner" [size]="15" />
                }
                <span>{{ creating() ? 'Création...' : 'Créer la classe' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal: Rejoindre une classe -->
    @if (joinModalOpen()) {
      <div
        class="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
        (click)="!joining() && joinModalOpen.set(false)"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-extrabold text-[#182033]">Rejoindre une classe</h3>
            <button
              type="button"
              (click)="joinModalOpen.set(false)"
              [disabled]="joining()"
              class="text-slate-400 hover:text-slate-600 disabled:opacity-40"
            >
              <app-icon name="close" [size]="18" />
            </button>
          </div>
          <form (ngSubmit)="join()" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Code d'accès de la classe *</label>
              <input name="code" [(ngModel)]="code" [disabled]="joining()" placeholder="Ex: CL-WEB24" class="input uppercase" required />
            </div>
            @if (modalError()) {
              <p class="text-xs text-red-600">{{ modalError() }}</p>
            }
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" (click)="joinModalOpen.set(false)" [disabled]="joining()" class="btn-light">
                Annuler
              </button>
              <button type="submit" class="btn" [disabled]="joining() || !code.trim()">
                @if (joining()) {
                  <app-icon name="spinner" [size]="15" />
                }
                <span>{{ joining() ? 'Connexion...' : 'Rejoindre' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  search = '';
  nom = '';
  matiere = '';
  description = '';
  code = '';
  createModalOpen = signal(false);
  joinModalOpen = signal(false);
  modalError = signal('');
  menuId = signal<string | null>(null);
  creating = signal(false);
  joining = signal(false);
  archivingId = signal<string | null>(null);

  openCreateModal(): void {
    this.modalError.set('');
    this.createModalOpen.set(true);
  }

  openJoinModal(): void {
    this.modalError.set('');
    this.joinModalOpen.set(true);
  }

  openClass(id: string): void {
    void this.router.navigate(['/classes', id]);
  }

  toggleMenu(id: string, ev: Event): void {
    ev.stopPropagation();
    if (this.archivingId()) return;
    this.menuId.update((cur) => (cur === id ? null : id));
  }

  closeMenu(ev: Event): void {
    ev.stopPropagation();
    this.menuId.set(null);
  }

  async archive(id: string): Promise<void> {
    if (this.archivingId()) return;
    this.menuId.set(null);
    this.archivingId.set(id);
    try {
      await this.api.archive(id, true);
      await this.store.refresh();
    } catch (e) {
      this.store.error.set((e as Error).message);
    } finally {
      this.archivingId.set(null);
    }
  }

  leaveTarget = signal<{ id: string; nom: string } | null>(null);
  leaving = signal(false);

  leave(id: string): void {
    this.menuId.set(null);
    this.leaveTarget.set({ id, nom: this.store.className(id) });
  }

  async confirmLeave(): Promise<void> {
    const t = this.leaveTarget();
    if (!t || this.leaving()) return;
    this.leaving.set(true);
    try {
      await this.store.leaveClass(t.id);
      this.leaveTarget.set(null);
    } catch (e) {
      this.store.error.set((e as Error).message);
    } finally {
      this.leaving.set(false);
    }
  }

  readonly filteredClasses = computed(() => {
    const q = this.search.trim().toLowerCase();
    const list = this.store.roleClasses();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        (c.matiere ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  });

  readonly upcoming = computed(() => {
    const allowedIds = new Set(this.store.roleClasses().map((c) => c.id));
    return this.store
      .assignments()
      .filter((a) => allowedIds.has(a.classeId) && a.dateLimite)
      .sort((a, b) => a.dateLimite!.localeCompare(b.dateLimite!))
      .slice(0, 5);
  });

  async create(): Promise<void> {
    if (this.creating() || !this.nom.trim()) return;
    this.modalError.set('');
    this.creating.set(true);
    try {
      const c = await this.api.createClass(this.nom.trim(), this.matiere.trim(), this.description.trim());
      this.createModalOpen.set(false);
      this.nom = this.matiere = this.description = '';
      await this.store.refresh();
      await this.router.navigate(['/classes', c.id]);
    } catch (e) {
      this.modalError.set((e as Error).message);
    } finally {
      this.creating.set(false);
    }
  }

  async join(): Promise<void> {
    if (this.joining() || !this.code.trim()) return;
    this.modalError.set('');
    this.joining.set(true);
    try {
      const i = await this.api.joinClass(this.code.trim());
      this.joinModalOpen.set(false);
      this.code = '';
      await this.store.refresh();
      await this.router.navigate(['/classes', i.classeId]);
    } catch (e) {
      this.modalError.set((e as Error).message);
    } finally {
      this.joining.set(false);
    }
  }
}
