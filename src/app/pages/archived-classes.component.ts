import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Classe } from '../core/models';
import { StoreService } from '../core/store.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-archived-classes',
  imports: [RouterLink, FormsModule, IconComponent],
  template: `
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#2454d6] mb-1">
          ARCHIVES
        </p>
        <h1 class="text-2xl md:text-3xl font-extrabold text-[#182033]">Cours archivés</h1>
        <p class="text-sm text-slate-500 mt-1">
          Consultez vos cours archivés. Vous pouvez les désarchiver pour les restaurer dans votre liste principale ou les supprimer définitivement.
        </p>
      </div>

      <div class="relative w-full sm:w-64 shrink-0">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <app-icon name="search" [size]="15" />
        </span>
        <input
          type="text"
          [(ngModel)]="search"
          placeholder="Rechercher un cours archivé..."
          class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-[#2454d6]"
        />
      </div>
    </div>

    @if (msg()) {
      <div class="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700">
        {{ msg() }}
      </div>
    }
    @if (err()) {
      <div class="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-600">
        {{ err() }}
      </div>
    }

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      @for (c of filteredArchived(); track c.id) {
        <div
          class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs flex flex-col"
        >
          <!-- Top Banner -->
          <div
            class="h-24 p-4 relative flex items-start justify-between text-white opacity-90"
            [class]="store.themeForClass(c.id).bannerBg"
          >
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-white/90">
                {{ c.matiere || 'INFORMATIQUE' }}
              </span>
              <span class="ml-2 text-[10px] font-bold bg-black/25 text-white rounded-md px-2 py-0.5">
                Archivé
              </span>
            </div>

            <div
              class="w-10 h-10 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center absolute -bottom-5 right-4"
              [class]="store.themeForClass(c.id).accentText"
            >
              <app-icon name="archive" [size]="18" />
            </div>
          </div>

          <!-- Body -->
          <div class="p-4 pt-6 flex-1 flex flex-col justify-between">
            <div>
              <a
                [routerLink]="['/classes', c.id]"
                class="font-extrabold text-[15px] text-[#182033] hover:text-[#2454d6] transition-colors block"
              >
                {{ c.nom }}
              </a>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ store.teacherNameForClass(c.id) }} · {{ store.memberCountForClass(c.id) }} membre(s)
              </p>
            </div>

            <!-- Actions: Désarchiver | Supprimer -->
            <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                (click)="unarchive(c)"
                class="flex-1 bg-[#eef3ff] hover:bg-blue-100 text-[#2454d6] font-bold text-xs rounded-xl px-3 py-2 transition-colors"
              >
                Désarchiver
              </button>
              <button
                type="button"
                (click)="openDeleteModal(c)"
                class="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl px-3 py-2 inline-flex items-center gap-1.5 transition-colors"
                title="Supprimer définitivement"
              >
                <app-icon name="trash" [size]="14" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      } @empty {
        <div class="sm:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
          <div class="w-12 h-12 rounded-2xl bg-[#eef3ff] text-[#2454d6] flex items-center justify-center mx-auto mb-3">
            <app-icon name="archive" [size]="22" />
          </div>
          <p class="text-sm font-bold text-[#182033]">Aucun cours archivé</p>
          <p class="text-xs text-slate-500 mt-1">
            Les cours que vous archivez depuis les paramètres d'une classe apparaîtront ici et seront masqués de la liste principale.
          </p>
        </div>
      }
    </div>

    <!-- Modal: Confirm Permanent Delete by typing "delete" -->
    @if (classToDelete(); as target) {
      <div
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        (click)="closeDeleteModal()"
      >
        <div
          class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <app-icon name="trash" [size]="18" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-[#182033]">Supprimer définitivement</h3>
                <p class="text-xs text-slate-500">{{ target.nom }}</p>
              </div>
            </div>
            <button type="button" (click)="closeDeleteModal()" class="text-slate-400 hover:text-slate-600">
              <app-icon name="close" [size]="18" />
            </button>
          </div>

          <div class="rounded-xl bg-red-50/70 border border-red-200/80 p-3.5 text-xs text-red-700 leading-relaxed">
            Cette action est <strong>irréversible</strong>. Toutes les publications, devoirs et notes associés à ce cours seront supprimés définitivement.
          </div>

          <div>
            <label class="block text-xs font-bold text-[#182033] mb-1.5">
              Tapez <span class="font-mono bg-slate-100 text-red-600 px-1.5 py-0.5 rounded">delete</span> pour confirmer la suppression :
            </label>
            <input
              type="text"
              name="confirmDeleteInput"
              [(ngModel)]="confirmText"
              placeholder="delete"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono focus:border-red-500"
              autocomplete="off"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="closeDeleteModal()" class="btn-light !text-xs">
              Annuler
            </button>
            <button
              type="button"
              (click)="confirmPermanentDelete()"
              [disabled]="confirmText.trim().toLowerCase() !== 'delete' || deleting()"
              class="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl px-4 py-2 transition-colors"
            >
              {{ deleting() ? 'Suppression...' : 'Supprimer définitivement' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ArchivedClassesComponent {
  readonly store = inject(StoreService);
  private readonly api = inject(ApiService);

  search = '';
  classToDelete = signal<Classe | null>(null);
  confirmText = '';
  deleting = signal(false);
  msg = signal('');
  err = signal('');

  readonly filteredArchived = computed(() => {
    const q = this.search.trim().toLowerCase();
    const list = this.store.archivedClasses();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        (c.matiere ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    );
  });

  async unarchive(c: Classe): Promise<void> {
    this.msg.set('');
    this.err.set('');
    try {
      await this.api.archive(c.id, false);
      await this.store.refresh();
      this.msg.set(`Le cours « ${c.nom} » a été désarchivé et restauré dans vos classes actives.`);
    } catch (e) {
      this.err.set((e as Error).message);
    }
  }

  openDeleteModal(c: Classe): void {
    this.confirmText = '';
    this.classToDelete.set(c);
  }

  closeDeleteModal(): void {
    this.classToDelete.set(null);
    this.confirmText = '';
  }

  async confirmPermanentDelete(): Promise<void> {
    const target = this.classToDelete();
    if (!target || this.confirmText.trim().toLowerCase() !== 'delete') return;
    this.deleting.set(true);
    this.msg.set('');
    this.err.set('');
    try {
      await this.store.deleteClassPermanently(target.id);
      this.closeDeleteModal();
      this.msg.set(`Le cours « ${target.nom} » a été supprimé définitivement.`);
    } catch (e) {
      this.err.set((e as Error).message);
    } finally {
      this.deleting.set(false);
    }
  }
}
