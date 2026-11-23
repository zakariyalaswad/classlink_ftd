import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PreferenceNotification } from '../core/models';
import { IconComponent } from '../shared/icon.component';

interface NotificationRow {
  type: string;
  label: string;
  dansApplication: boolean;
  parEmail: boolean;
}

const DEFAULT_NOTIFICATION_ROWS: { type: string; label: string; defaultEmail: boolean }[] = [
  { type: 'NOUVELLE_ANNONCE', label: 'Nouvelle annonce', defaultEmail: true },
  { type: 'NOUVEAU_COURS', label: 'Nouveau cours', defaultEmail: true },
  { type: 'NOUVEAU_DEVOIR', label: 'Nouveau devoir', defaultEmail: true },
  { type: 'RAPPEL_ECHEANCE', label: "Rappel d'échéance", defaultEmail: true },
  { type: 'NOUVEAU_COMMENTAIRE', label: 'Nouveau commentaire', defaultEmail: false },
  { type: 'NOUVELLE_REMISE', label: 'Nouvelle remise', defaultEmail: true },
  { type: 'REMISE_CORRIGEE', label: 'Note publiée', defaultEmail: true },
];

@Component({
  selector: 'app-settings',
  imports: [FormsModule, IconComponent],
  template: `
    <div class="space-y-6 pb-8">
      <!-- Page Header -->
      <div>
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#2454d6] mb-1">
          VOTRE ESPACE
        </p>
        <h1 class="text-2xl md:text-3xl font-extrabold text-[#182033]">Paramètres du compte</h1>
        <p class="text-sm text-slate-500 mt-1">
          Gérez vos informations et vos préférences personnelles.
        </p>
      </div>

      @if (msg()) {
        <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700">
          {{ msg() }}
        </div>
      }
      @if (err()) {
        <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-600">
          {{ err() }}
        </div>
      }

      <!-- SECTION 1: PROFIL -->
      <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div class="w-10 h-10 rounded-xl bg-[#eef3ff] text-[#2454d6] flex items-center justify-center shrink-0">
            <app-icon name="users" [size]="18" />
          </div>
          <div>
            <h2 class="text-base font-extrabold text-[#182033]">Profil</h2>
            <p class="text-xs text-slate-400">Vos informations visibles dans ClassLink.</p>
          </div>
        </div>

        <div class="mt-5 flex flex-col md:flex-row gap-6 items-start">
          <!-- Left Photo Box -->
          <div class="w-full md:w-44 rounded-2xl bg-[#f8faff] border border-slate-100 p-5 flex flex-col items-center justify-center shrink-0">
            @if (photoDataUrl()) {
              <img
                [src]="photoDataUrl()"
                alt="Photo de profil"
                class="w-16 h-16 rounded-full object-cover border-2 border-[#dbe6fd] shadow-xs"
              />
            } @else {
              <div class="w-16 h-16 rounded-full bg-[#dbe6fd] text-[#2454d6] font-extrabold text-base flex items-center justify-center select-none">
                {{ initials() }}
              </div>
            }
            <label class="mt-3 text-xs font-bold text-[#2454d6] hover:underline cursor-pointer">
              Choisir une photo
              <input
                type="file"
                accept="image/*"
                class="hidden"
                (change)="onPhotoSelected($event)"
              />
            </label>
            @if (photoDataUrl()) {
              <button
                type="button"
                (click)="removePhoto()"
                class="mt-1 text-[11px] text-slate-400 hover:text-red-600"
              >
                Supprimer
              </button>
            }
          </div>

          <!-- Right Inputs -->
          <div class="flex-1 w-full space-y-4">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-[#182033] mb-1.5">Prénom</label>
                <input
                  type="text"
                  name="prenom"
                  [(ngModel)]="prenom"
                  placeholder="Camille"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#182033] focus:border-[#2454d6]"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-[#182033] mb-1.5">Nom</label>
                <input
                  type="text"
                  name="nom"
                  [(ngModel)]="nom"
                  placeholder="Dupont"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#182033] focus:border-[#2454d6]"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#182033] mb-1.5">Adresse email</label>
              <input
                type="email"
                [value]="auth.profile()?.email || auth.user()?.email || 'camille.dupont@exemple.fr'"
                disabled
                class="w-full rounded-xl border border-slate-200 bg-[#f3f5f9] px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              />
              <p class="text-[11px] text-slate-400 mt-1.5">
                L'adresse email ne peut pas être modifiée dans ce prototype.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 2: SÉCURITÉ -->
      <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div class="w-10 h-10 rounded-xl bg-[#eef3ff] text-[#2454d6] flex items-center justify-center shrink-0">
            <app-icon name="gear" [size]="18" />
          </div>
          <div>
            <h2 class="text-base font-extrabold text-[#182033]">Sécurité</h2>
            <p class="text-xs text-slate-400">
              Le changement de mot de passe est simulé et aucun mot de passe n'est enregistré.
            </p>
          </div>
        </div>

        <div class="mt-5 grid sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-[#182033] mb-1.5">Mot de passe actuel</label>
            <input
              type="password"
              name="currentPwd"
              [(ngModel)]="currentPassword"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#182033] focus:border-[#2454d6]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#182033] mb-1.5">Nouveau mot de passe</label>
            <input
              type="password"
              name="newPwd"
              [(ngModel)]="newPassword"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#182033] focus:border-[#2454d6]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#182033] mb-1.5">Confirmation</label>
            <input
              type="password"
              name="confirmPwd"
              [(ngModel)]="confirmPassword"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-[#182033] focus:border-[#2454d6]"
            />
          </div>
        </div>
      </section>

      <!-- SECTION 3: NOTIFICATIONS -->
      <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div class="flex items-center gap-3.5 pb-4">
          <div class="w-10 h-10 rounded-xl bg-[#eef3ff] text-[#2454d6] flex items-center justify-center shrink-0">
            <app-icon name="bell" [size]="18" />
          </div>
          <div>
            <h2 class="text-base font-extrabold text-[#182033]">Notifications</h2>
            <p class="text-xs text-slate-400">Les emails sont simulés dans ce prototype.</p>
          </div>
        </div>

        <div class="mt-2 rounded-xl border border-slate-200/80 overflow-hidden">
          <!-- Table Header -->
          <div class="grid grid-cols-12 bg-[#f8f9fc] px-4 py-3 text-[11px] font-bold text-slate-500 border-b border-slate-200/70">
            <div class="col-span-6 sm:col-span-8">Type de notification</div>
            <div class="col-span-3 sm:col-span-2 text-center">Dans l'application</div>
            <div class="col-span-3 sm:col-span-2 text-center">
              Par email <span class="font-normal text-slate-400">(simulé)</span>
            </div>
          </div>

          <!-- Notification Rows -->
          <div class="divide-y divide-slate-100">
            @for (row of rows(); track row.type) {
              <div class="grid grid-cols-12 items-center px-4 py-3.5 text-xs">
                <div class="col-span-6 sm:col-span-8 font-medium text-[#182033]">
                  {{ row.label }}
                </div>
                <div class="col-span-3 sm:col-span-2 flex justify-center">
                  <button
                    type="button"
                    (click)="toggleApp(row)"
                    class="w-10 h-5 rounded-full transition-colors p-0.5 flex items-center"
                    [class]="row.dansApplication ? 'bg-[#2454d6] justify-end' : 'bg-slate-300 justify-start'"
                    [attr.aria-label]="row.label + ' dans l application'"
                  >
                    <span class="w-4 h-4 rounded-full bg-white shadow-2xs block"></span>
                  </button>
                </div>
                <div class="col-span-3 sm:col-span-2 flex justify-center">
                  <button
                    type="button"
                    (click)="toggleEmail(row)"
                    class="w-10 h-5 rounded-full transition-colors p-0.5 flex items-center"
                    [class]="row.parEmail ? 'bg-[#2454d6] justify-end' : 'bg-slate-300 justify-start'"
                    [attr.aria-label]="row.label + ' par email'"
                  >
                    <span class="w-4 h-4 rounded-full bg-white shadow-2xs block"></span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- BOTTOM ACTION BAR (Annuler | Enregistrer) -->
      <div class="bg-white rounded-2xl border border-slate-200/80 px-6 py-4 shadow-2xs flex items-center justify-end gap-4">
        <button
          type="button"
          (click)="reset()"
          class="text-xs font-bold text-slate-600 hover:text-[#182033] px-3 py-2 transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          (click)="save()"
          [disabled]="saving()"
          class="bg-[#2454d6] hover:bg-[#1d46b8] disabled:opacity-60 text-white font-bold text-xs rounded-xl px-5 py-2.5 shadow-xs transition-colors"
        >
          {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  prenom = '';
  nom = '';
  photoDataUrl = signal<string | null>(null);
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  rows = signal<NotificationRow[]>(
    DEFAULT_NOTIFICATION_ROWS.map((r) => ({
      type: r.type,
      label: r.label,
      dansApplication: true,
      parEmail: r.defaultEmail,
    })),
  );

  saving = signal(false);
  msg = signal('');
  err = signal('');

  constructor() {
    effect(() => {
      const p = this.auth.profile();
      if (p) {
        if (!this.prenom && !this.nom) {
          this.prenom = p.prenom ?? '';
          this.nom = p.nom ?? '';
        }
        if (this.photoDataUrl() === null && this.auth.photoUrl()) {
          this.photoDataUrl.set(this.auth.photoUrl());
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.loadFromProfile();
    await this.loadPreferences();
  }

  private loadFromProfile(): void {
    const p = this.auth.profile();
    if (p) {
      this.prenom = p.prenom ?? '';
      this.nom = p.nom ?? '';
    }
    this.photoDataUrl.set(this.auth.photoUrl());
  }

  private async loadPreferences(): Promise<void> {
    const prefs = await this.api.getPreferences().catch(() => [] as PreferenceNotification[]);
    const byType = new Map(prefs.map((p) => [p.type, p]));
    this.rows.set(
      DEFAULT_NOTIFICATION_ROWS.map((def) => {
        const match = byType.get(def.type);
        return {
          type: def.type,
          label: def.label,
          dansApplication: match ? match.dansApplication : true,
          parEmail: match ? match.parEmail : def.defaultEmail,
        };
      }),
    );
  }

  initials(): string {
    const f = (this.prenom.trim()[0] || 'C').toUpperCase();
    const l = (this.nom.trim()[0] || 'D').toUpperCase();
    return f + l;
  }

  onPhotoSelected(event: Event): void {
    this.err.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.err.set('Veuillez choisir un fichier image (PNG, JPG, WEBP...).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.err.set('La photo ne doit pas dépasser 4 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (result) {
        this.resizeImage(result, 256, 256).then((resized) => {
          this.photoDataUrl.set(resized);
          this.msg.set('Photo chargée. Cliquez sur « Enregistrer » pour valider.');
        });
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(): void {
    this.photoDataUrl.set(null);
  }

  private resizeImage(dataUrl: string, maxW: number, maxH: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  toggleApp(row: NotificationRow): void {
    this.rows.update((list) =>
      list.map((r) => (r.type === row.type ? { ...r, dansApplication: !r.dansApplication } : r)),
    );
  }

  toggleEmail(row: NotificationRow): void {
    this.rows.update((list) =>
      list.map((r) => (r.type === row.type ? { ...r, parEmail: !r.parEmail } : r)),
    );
  }

  async reset(): Promise<void> {
    this.msg.set('');
    this.err.set('');
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.loadFromProfile();
    await this.loadPreferences();
  }

  async save(): Promise<void> {
    this.msg.set('');
    this.err.set('');
    if (this.newPassword && this.newPassword !== this.confirmPassword) {
      this.err.set('La confirmation du mot de passe ne correspond pas.');
      return;
    }
    this.saving.set(true);
    try {
      await this.auth.updateProfile(
        this.nom.trim() || this.auth.profile()?.nom || '',
        this.prenom.trim() || this.auth.profile()?.prenom || '',
        this.photoDataUrl(),
      );
      await Promise.all(
        this.rows().map((r) =>
          this.api.updatePreference(r.type, r.dansApplication, r.parEmail).catch(() => undefined),
        ),
      );
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.msg.set('Vos paramètres et votre photo de profil ont été enregistrés.');
    } catch (e) {
      this.err.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
