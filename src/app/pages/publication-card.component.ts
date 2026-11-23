import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FileStorageService, StoredFileAttachment } from '../core/file-storage.service';
import { Commentaire, Publication, Remise } from '../core/models';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent } from '../shared/icon.component';

export type { StoredFileAttachment } from '../core/file-storage.service';

const FILE_MARKER_REGEX = /\n?\[\[FILE:([^|\]]+)\|([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/g;

interface PreviewModalData {
  name: string;
  typeLabel: string;
  sizeLabel: string;
  dataUrl: string;
  blobUrl: string;
  safeUrl: SafeResourceUrl | null;
  mimeType: string;
  textContent: string | null;
}

/** One publication card matching the Figma stream card design with built-in file reader/viewer modal. */
@Component({
  selector: 'app-publication-card',
  imports: [FormsModule, DatePipe, AvatarComponent, IconComponent],
  template: `
    <article class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
      <!-- Author Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <app-avatar [name]="pub().nomAuteur || 'Enseignant'" size="medium" />
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-[#182033]">{{ pub().nomAuteur }}</h3>
              @if (pub().type !== 'ANNONCE') {
                <span
                  class="text-[10px] font-extrabold uppercase tracking-wider rounded-md px-2 py-0.5"
                  [class]="
                    pub().type === 'DEVOIR'
                      ? 'bg-blue-50 text-[#2454d6]'
                      : 'bg-violet-50 text-[#6d48d9]'
                  "
                >
                  {{ pub().type }}
                </span>
              }
            </div>
            <p class="text-xs text-slate-400">
              Enseignant(e) · {{ pub().datePublication | date: 'dd MMM à HH:mm' }}
              @if (pub().dateLimite) {
                · <span class="text-orange-600 font-semibold">Échéance : {{ pub().dateLimite | date: 'dd MMM à HH:mm' }}</span>
              }
              @if (pub().bareme) {
                · {{ pub().bareme }} points
              }
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="toggleDetails()"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          title="Options / Détails"
        >
          <app-icon name="more" [size]="18" />
        </button>
      </div>

      <!-- Publication Title & Clean Body -->
      <div class="mt-3.5 text-sm text-[#182033] space-y-2">
        @if (pub().titre) {
          <p class="font-bold text-[15px]">{{ pub().titre }}</p>
        }
        @if (cleanBody()) {
          <p class="whitespace-pre-line text-slate-700 leading-relaxed">{{ cleanBody() }}</p>
        }
      </div>

      <!-- Attached Files (Click to read in-app!) -->
      @if (pubAttachments().length > 0) {
        <div class="mt-4 flex flex-wrap gap-3">
          @for (att of pubAttachments(); track att.name) {
            <button
              type="button"
              (click)="openFileViewer(att, 'pub_' + pub().id)"
              class="inline-flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white hover:bg-[#f6f9ff] hover:border-blue-300 px-3.5 py-2.5 transition-all max-w-md w-full sm:w-80 shadow-2xs text-left group"
            >
              <span class="w-9 h-9 rounded-lg bg-[#eef3ff] text-[#2454d6] flex items-center justify-center shrink-0">
                <app-icon name="file" [size]="18" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-[#182033] group-hover:text-[#2454d6] truncate">{{ att.name }}</p>
                <p class="text-[11px] text-slate-400">{{ att.typeLabel }} · {{ att.sizeLabel }} · <span class="text-[#2454d6] font-semibold">Ouvrir</span></p>
              </div>
            </button>
          }
        </div>
      } @else if (pub().type === 'DEVOIR' || pub().type === 'COURS') {
        <div
          (click)="toggleDetails()"
          class="mt-4 inline-flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-100/70 px-3.5 py-2.5 cursor-pointer transition-colors max-w-md w-full"
        >
          <span class="w-9 h-9 rounded-lg bg-[#eef3ff] text-[#2454d6] flex items-center justify-center shrink-0">
            <app-icon [name]="pub().type === 'DEVOIR' ? 'file' : 'book'" [size]="18" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-[#182033] truncate">{{ pub().titre }}</p>
            <p class="text-[11px] text-slate-400">
              {{ pub().type === 'DEVOIR' ? (isTeacher() ? 'Cliquez pour voir les remises' : 'Cliquez pour remettre votre devoir (texte ou fichier)') : 'Support de cours' }}
            </p>
          </div>
        </div>
      }

      @if (pub().type === 'DEVOIR' && !detailsOpen()) {
        <div class="mt-3">
          <button
            type="button"
            (click)="toggleDetails()"
            class="text-xs font-bold text-[#2454d6] hover:underline"
          >
            {{ isTeacher() ? 'Voir les remises des étudiants' : 'Remettre un fichier / Voir ma remise' }}
          </button>
        </div>
      }

      <!-- Assignment Submission / Grading Drawer -->
      @if (detailsOpen() && pub().type === 'DEVOIR') {
        <div class="mt-4 pt-4 border-t border-slate-100">
          @if (isTeacher()) {
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
              Remises des étudiants ({{ submissions().length }})
            </h4>
            @for (r of submissions(); track r.id) {
              <div class="rounded-xl bg-slate-50 border border-slate-200/60 p-3 mb-2.5 text-xs">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-[#182033]">{{ r.nomEtudiant }}</span>
                  <span class="text-slate-400">{{ r.dateRemise | date: 'dd/MM HH:mm' }}</span>
                </div>
                @if (cleanText(r.texte)) {
                  <p class="whitespace-pre-line text-slate-700 mb-2">{{ cleanText(r.texte) }}</p>
                }
                @for (att of parseAttachments(r.texte); track att.name) {
                  <button
                    type="button"
                    (click)="openFileViewer(att, 'sub_' + pub().id)"
                    class="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 px-3 py-1.5 mb-2 text-xs hover:bg-blue-50/40 transition-colors"
                  >
                    <span class="text-[#2454d6]"><app-icon name="file" [size]="15" /></span>
                    <span class="font-bold text-[#182033]">{{ att.name }}</span>
                    <span class="text-slate-400 text-[11px]">({{ att.sizeLabel }})</span>
                    <span class="text-[#2454d6] font-bold text-[11px]">Lire</span>
                  </button>
                }
                <form (ngSubmit)="grade(r)" class="flex flex-wrap gap-2 items-center mt-1">
                  <input
                    [name]="'n' + r.id"
                    type="number"
                    [(ngModel)]="grades[r.id]"
                    placeholder="Note"
                    class="input !w-24 !py-1.5 !text-xs"
                  />
                  <input
                    [name]="'c' + r.id"
                    [(ngModel)]="corrections[r.id]"
                    placeholder="Commentaire de correction"
                    class="input flex-1 min-w-40 !py-1.5 !text-xs"
                  />
                  <button class="btn !py-1.5 !px-3 !text-xs">Noter</button>
                </form>
                @if (r.note != null) {
                  <p class="text-[11px] text-emerald-700 font-semibold mt-1.5">
                    Note enregistrée : {{ r.note }}{{ pub().bareme ? '/' + pub().bareme : '/20' }}
                  </p>
                }
              </div>
            } @empty {
              <p class="text-xs text-slate-400">Aucune remise pour ce devoir.</p>
            }
          } @else {
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Ma remise</h4>
            @if (mine(); as m) {
              <div class="rounded-xl bg-slate-50 border border-slate-200/60 p-3 text-xs mb-3">
                @if (cleanText(m.texte)) {
                  <p class="whitespace-pre-line text-slate-700 mb-2">{{ cleanText(m.texte) }}</p>
                }
                @for (att of parseAttachments(m.texte); track att.name) {
                  <button
                    type="button"
                    (click)="openFileViewer(att, 'sub_' + pub().id)"
                    class="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 px-3 py-2 text-xs hover:bg-blue-50/40 transition-colors"
                  >
                    <span class="text-[#2454d6]"><app-icon name="file" [size]="16" /></span>
                    <span class="font-bold text-[#182033]">{{ att.name }}</span>
                    <span class="text-slate-400 text-[11px]">({{ att.sizeLabel }})</span>
                    <span class="text-[#2454d6] font-bold text-[11px]">Lire</span>
                  </button>
                }
                @if (m.note != null) {
                  <p class="mt-2 text-emerald-700 font-bold">
                    Note obtenue : {{ m.note }}{{ pub().bareme ? '/' + pub().bareme : '/20' }}
                  </p>
                  @if (m.correction) {
                    <p class="text-slate-600 mt-0.5">{{ m.correction }}</p>
                  }
                } @else {
                  <p class="text-[11px] text-slate-400 mt-1.5">Remis · En attente de correction</p>
                }
              </div>
            }
            <form (ngSubmit)="submit()" class="space-y-2.5">
              <textarea
                name="t"
                [(ngModel)]="texte"
                rows="2"
                class="input !text-xs"
                [placeholder]="mine() ? 'Modifier votre commentaire ou fichier...' : 'Saisissez votre réponse ou joignez un fichier...'"
              ></textarea>

              <!-- Attached file pill before submitting -->
              @if (submissionAttachment(); as att) {
                <div class="inline-flex items-center gap-2.5 rounded-xl bg-[#eef3ff] border border-blue-200 px-3 py-1.5 text-xs">
                  <span class="text-[#2454d6]"><app-icon name="file" [size]="15" /></span>
                  <span class="font-bold text-[#182033]">{{ att.name }}</span>
                  <span class="text-[11px] text-slate-500">({{ att.sizeLabel }})</span>
                  <button
                    type="button"
                    (click)="submissionAttachment.set(null)"
                    class="text-slate-400 hover:text-red-600"
                  >
                    <app-icon name="close" [size]="14" />
                  </button>
                </div>
              }

              <div class="flex flex-wrap items-center gap-2">
                <label class="btn-light !py-1.5 !px-3 !text-xs cursor-pointer gap-1.5">
                  <app-icon name="file" [size]="14" />
                  {{ uploadingFile() ? 'Envoi sur Cloudinary...' : 'Joindre un fichier (PDF, ZIP, image...)' }}
                  <input
                    type="file"
                    class="hidden"
                    [disabled]="uploadingFile()"
                    (change)="onSubmissionFileSelected($event)"
                  />
                </label>
                <button
                  type="submit"
                  class="btn !py-1.5 !px-3 !text-xs"
                  [disabled]="uploadingFile() || (!texte.trim() && !submissionAttachment())"
                >
                  {{ mine() ? 'Mettre à jour la remise' : 'Remettre le devoir' }}
                </button>
              </div>
            </form>
          }
        </div>
      }

      <!-- Comments Section -->
      <div class="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
        @if (comments().length > 0) {
          <p class="text-[11px] font-semibold text-slate-400">
            {{ comments().length }} commentaire{{ comments().length > 1 ? 's' : '' }}
          </p>
          <div class="space-y-2.5">
            @for (c of comments(); track c.id) {
              <div class="flex items-start gap-2.5">
                <app-avatar [name]="c.nomAuteur" size="small" />
                <div class="bg-[#f5f7fb] rounded-2xl px-3.5 py-2 text-xs">
                  <p class="font-bold text-[#182033]">{{ c.nomAuteur }}</p>
                  <p class="text-slate-700 mt-0.5">{{ c.contenu }}</p>
                </div>
              </div>
            }
          </div>
        }

        @if (canComment()) {
          <form (ngSubmit)="comment()" class="flex items-center gap-2.5 pt-1">
            <app-avatar [name]="auth.fullName() || 'Camille Dupont'" [photoUrl]="auth.photoUrl()" size="small" />
            <div class="flex-1 relative">
              <input
                name="cm"
                [(ngModel)]="newComment"
                placeholder="Ajouter un commentaire..."
                class="w-full rounded-full border border-slate-200 bg-[#f9fafc] px-4 py-2 text-xs placeholder:text-slate-400 focus:bg-white focus:border-[#2454d6]"
              />
            </div>
            <button
              type="submit"
              [disabled]="!newComment.trim()"
              class="p-2 text-[#2454d6] hover:bg-blue-50 rounded-full disabled:opacity-40 transition-colors"
              aria-label="Envoyer"
            >
              <app-icon name="send" [size]="16" />
            </button>
          </form>
        }
        @if (error()) {
          <p class="text-xs text-red-600">{{ error() }}</p>
        }
      </div>
    </article>

    <!-- IN-APP FILE VIEWER / READER MODAL -->
    @if (previewModal(); as p) {
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        (click)="closeFileViewer()"
      >
        <div
          class="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
          <div class="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg bg-[#eef3ff] text-[#2454d6] flex items-center justify-center shrink-0">
                <app-icon name="file" [size]="18" />
              </span>
              <div class="min-w-0">
                <h3 class="text-sm font-extrabold text-[#182033] truncate">{{ p.name }}</h3>
                <p class="text-[11px] text-slate-400">{{ p.typeLabel }} · {{ p.sizeLabel }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              @if (p.blobUrl || p.dataUrl) {
                <a
                  [href]="p.blobUrl || p.dataUrl"
                  target="_blank"
                  rel="noopener"
                  class="btn-light !py-1.5 !px-3 !text-xs"
                >
                  Ouvrir dans un nouvel onglet
                </a>
                <a
                  [href]="p.blobUrl || p.dataUrl"
                  [attr.download]="p.name"
                  class="btn !py-1.5 !px-3 !text-xs"
                >
                  Télécharger
                </a>
              }
              <button
                type="button"
                (click)="closeFileViewer()"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <app-icon name="close" [size]="18" />
              </button>
            </div>
          </div>

          <!-- Modal Content Viewer -->
          <div class="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4">
            @if (!p.dataUrl) {
              <div class="bg-white rounded-2xl p-8 text-center max-w-md shadow-xs">
                <p class="text-sm font-bold text-[#182033]">Aperçu indisponible</p>
                <p class="text-xs text-slate-500 mt-1">
                  Ce fichier a été ajouté depuis une autre session ou son contenu binaire n'est pas stocké dans ce navigateur. Ré-uploadez le fichier pour le consulter directement ici.
                </p>
              </div>
            } @else if (p.mimeType.startsWith('image/')) {
              <img [src]="p.blobUrl || p.dataUrl" [alt]="p.name" class="max-h-full max-w-full object-contain rounded-lg shadow-md" />
            } @else if (p.textContent !== null) {
              <pre class="w-full h-full bg-white rounded-xl p-5 text-xs font-mono text-slate-800 overflow-auto whitespace-pre-wrap border border-slate-200">{{ p.textContent }}</pre>
            } @else if (p.safeUrl) {
              <iframe [src]="p.safeUrl" class="w-full h-full rounded-xl bg-white border border-slate-200" title="Lecteur de document"></iframe>
            } @else {
              <div class="bg-white rounded-2xl p-8 text-center max-w-md shadow-xs">
                <p class="text-sm font-bold text-[#182033]">Format non prévisualisable directement</p>
                <p class="text-xs text-slate-500 mt-1 mb-4">
                  Utilisez le bouton Télécharger ci-dessus pour ouvrir {{ p.name }} sur votre appareil.
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class PublicationCardComponent implements OnInit {
  readonly pub = input.required<Publication>();
  readonly isTeacher = input.required<boolean>();
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly fileStorage = inject(FileStorageService);

  detailsOpen = signal(false);
  comments = signal<Commentaire[]>([]);
  submissions = signal<Remise[]>([]);
  mine = signal<Remise | null>(null);
  canComment = signal(true);
  error = signal('');
  newComment = '';
  texte = '';
  submissionAttachment = signal<StoredFileAttachment | null>(null);
  uploadingFile = signal(false);
  previewModal = signal<PreviewModalData | null>(null);
  grades: Record<string, number | null> = {};
  corrections: Record<string, string> = {};

  cleanBody = computed(() => this.cleanText(this.pub().contenu ?? ''));
  pubAttachments = computed(() => this.parseAttachments(this.pub().contenu ?? ''));

  ngOnInit(): void {
    void this.api
      .canComment(this.pub().id)
      .then((r) => this.canComment.set(r.allowed))
      .catch(() => undefined);
    void this.api
      .getComments(this.pub().id)
      .then((c) => this.comments.set(c))
      .catch(() => undefined);
  }

  cleanText(raw: string): string {
    return (raw || '').replace(FILE_MARKER_REGEX, '').trim();
  }

  parseAttachments(raw: string): StoredFileAttachment[] {
    const out: StoredFileAttachment[] = [];
    if (!raw) return out;
    const regex = new RegExp(FILE_MARKER_REGEX.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
      out.push({
        name: m[1],
        typeLabel: m[2],
        sizeLabel: m[3],
        dataUrl: '',
        remoteUrl: m[4] || undefined,
      });
    }
    return out;
  }

  async openFileViewer(att: StoredFileAttachment, prefix: string): Promise<void> {
    const stored =
      att.dataUrl ||
      (await this.fileStorage.getFile([`${prefix}_${att.name}`, att.name]));
    const remoteUrl = att.remoteUrl || (stored.startsWith('http') ? stored : '');
    const dataUrl = stored.startsWith('data:') ? stored : '';

    let converted = dataUrl ? this.fileStorage.dataUrlToBlobUrl(dataUrl) : null;
    let fetchedRemoteText: string | null = null;

    if (!converted && remoteUrl) {
      const remoteBlob = await this.fileStorage.remoteUrlToBlobUrl(remoteUrl, att.name);
      if (remoteBlob) {
        converted = remoteBlob;
        fetchedRemoteText = remoteBlob.textContent;
      }
    }

    const ext = (att.name.split('.').pop() || '').toLowerCase();
    const isImageExt = /^(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(ext);
    const isPdfExt = ext === 'pdf';
    const mimeType =
      converted?.mimeType ||
      (isImageExt ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : isPdfExt ? 'application/pdf' : '');

    let textContent: string | null = fetchedRemoteText;
    if (
      textContent === null &&
      dataUrl &&
      (mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        /\.(txt|md|csv|json|xml|java|ts|js|html|css|sql)$/i.test(att.name))
    ) {
      try {
        const base64 = dataUrl.split(',')[1] || '';
        textContent = new TextDecoder().decode(
          Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        );
      } catch {
        textContent = null;
      }
    }

    const activeUrl = converted?.blobUrl || remoteUrl || dataUrl;
    const safeUrl =
      converted?.safeUrl || (remoteUrl ? this.fileStorage.trustUrl(remoteUrl) : null);

    this.previewModal.set({
      name: att.name,
      typeLabel: att.typeLabel,
      sizeLabel: att.sizeLabel,
      dataUrl: activeUrl,
      blobUrl: activeUrl,
      safeUrl,
      mimeType,
      textContent,
    });
  }

  closeFileViewer(): void {
    const current = this.previewModal();
    if (current?.blobUrl) {
      URL.revokeObjectURL(current.blobUrl);
    }
    this.previewModal.set(null);
  }

  async onSubmissionFileSelected(event: Event): Promise<void> {
    this.error.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const sizeLabel =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
        : `${Math.max(1, Math.round(file.size / 1024))} Ko`;
    const ext = (file.name.split('.').pop() || 'FICHIER').toUpperCase();

    // Read locally for immediate in-app preview & upload to Cloudinary in parallel
    const dataUrlPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    this.uploadingFile.set(true);
    try {
      const [dataUrl, remoteUrl] = await Promise.all([
        dataUrlPromise,
        this.fileStorage.uploadToCloudinary(file, 'classlink/submissions'),
      ]);
      this.submissionAttachment.set({
        name: file.name,
        sizeLabel,
        typeLabel: ext,
        dataUrl,
        remoteUrl,
      });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.uploadingFile.set(false);
      input.value = '';
    }
  }

  async toggleDetails(): Promise<void> {
    this.detailsOpen.update((o) => !o);
    if (this.detailsOpen() && this.pub().type === 'DEVOIR') {
      await this.loadSubmissions();
    }
  }

  private async loadSubmissions(): Promise<void> {
    this.error.set('');
    try {
      if (this.isTeacher()) {
        const subs = await this.api.getSubmissions(this.pub().id);
        this.submissions.set(subs);
        subs.forEach((s) => ((this.grades[s.id] = s.note ?? null), (this.corrections[s.id] = s.correction ?? '')));
      } else {
        this.mine.set(await this.api.getMySubmission(this.pub().id));
      }
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async comment(): Promise<void> {
    if (!this.newComment.trim()) return;
    try {
      await this.api.addComment(this.pub().id, this.newComment.trim());
      this.newComment = '';
      this.comments.set(await this.api.getComments(this.pub().id));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async submit(): Promise<void> {
    try {
      const att = this.submissionAttachment();
      let payload = this.texte.trim();
      if (att) {
        if (att.dataUrl) {
          await this.fileStorage.saveFile(`sub_${this.pub().id}_${att.name}`, att.dataUrl);
          await this.fileStorage.saveFile(att.name, att.dataUrl);
        }
        const urlPart = att.remoteUrl ? `|${att.remoteUrl}` : '';
        const marker = `[[FILE:${att.name}|${att.typeLabel}|${att.sizeLabel}${urlPart}]]`;
        payload = payload ? `${payload}\n${marker}` : marker;
      }
      if (!payload) return;
      this.mine.set(await this.api.submit(this.pub().id, payload));
      this.texte = '';
      this.submissionAttachment.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async grade(r: Remise): Promise<void> {
    const note = this.grades[r.id];
    if (note == null) return;
    try {
      const updated = await this.api.grade(r.id, Number(note), this.corrections[r.id] ?? '');
      this.submissions.update((l) => l.map((x) => (x.id === r.id ? updated : x)));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
