import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FileStorageService } from '../core/file-storage.service';
import { Classe, Inscription, Publication, Remise, TypePublication } from '../core/models';
import { StoreService } from '../core/store.service';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent } from '../shared/icon.component';
import { PublicationCardComponent, StoredFileAttachment } from './publication-card.component';

type ClassTab = 'STREAM' | 'WORK' | 'MEMBERS' | 'GRADES';
type WorkFilter = 'ALL' | 'COURS' | 'DEVOIR';

@Component({
  selector: 'app-class-detail',
  imports: [FormsModule, DatePipe, DecimalPipe, AvatarComponent, IconComponent, PublicationCardComponent],
  template: `
    @if (classe(); as c) {
      <!-- HERO BANNER (Figma exact match) -->
      <div
        class="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-sm mb-6 flex items-center justify-between"
        [class]="store.themeForClass(c.id).bannerBg"
      >
        <div class="relative z-10">
          <p class="text-[11px] font-extrabold uppercase tracking-wider text-white/85">
            {{ c.matiere || 'INFORMATIQUE' }} · {{ c.description || '2024–2025' }}
          </p>
          <h1 class="text-2xl md:text-3xl font-extrabold mt-1">{{ c.nom }}</h1>
          <p class="text-xs md:text-sm text-white/90 mt-1.5">
            {{ teacherDisplayName() }} · {{ members().length }} membre{{ members().length > 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Right decorative circle + teacher settings button -->
        <div class="flex items-center gap-4 relative z-10">
          @if (isTeacherView()) {
            <button
              type="button"
              (click)="settingsModalOpen.set(true)"
              class="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/25 flex items-center justify-center text-white transition-colors"
              title="Paramètres de la classe"
            >
              <app-icon name="gear" [size]="18" />
            </button>
          }
          <div class="hidden sm:flex w-28 h-28 rounded-full bg-white/10 border border-white/15 items-center justify-center">
            <div class="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center font-mono font-extrabold text-xl tracking-tighter">
              &lt;/&gt;
            </div>
          </div>
        </div>
      </div>

      <!-- 4 HORIZONTAL TABS (Fil d'actualité | Travaux et devoirs | Membres | Notes) -->
      <div class="border-b border-slate-200 mb-6 flex items-center gap-6 overflow-x-auto">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            (click)="selectTab(t.id)"
            class="pb-3 text-sm whitespace-nowrap border-b-2 transition-colors"
            [class]="
              activeTab() === t.id
                ? 'border-[#2454d6] text-[#2454d6] font-bold'
                : 'border-transparent text-slate-500 hover:text-[#182033] font-medium'
            "
          >
            {{ t.label }}
          </button>
        }
      </div>

      @if (error()) {
        <p class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">{{ error() }}</p>
      }

      <!-- ==================== TAB 1: FIL D'ACTUALITÉ ==================== -->
      @if (activeTab() === 'STREAM') {
        <div class="grid lg:grid-cols-12 gap-6 items-start">
          <!-- Left Sidebar Cards (4 cols on lg) -->
          <aside class="lg:col-span-4 space-y-4">
            <!-- Code de la classe (Only in Enseignant view, as in Figma) -->
            @if (isTeacherView()) {
              <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <p class="text-xs font-semibold text-slate-500">Code de la classe</p>
                <div class="flex items-center justify-between gap-2 mt-1.5">
                  <span class="text-xl font-extrabold tracking-tight text-[#2454d6]">{{ c.codeAcces }}</span>
                  <button
                    type="button"
                    (click)="copyCode(c.codeAcces)"
                    class="w-8 h-8 rounded-lg bg-[#eef3ff] text-[#2454d6] hover:bg-blue-100 flex items-center justify-center transition-colors"
                    title="Copier le code"
                  >
                    <app-icon [name]="copied() ? 'check' : 'copy'" [size]="15" />
                  </button>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Partagez ce code avec vos étudiants</p>
              </div>
            }

            <!-- Notifications de la classe toggle card -->
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-[#182033]">Notifications de la classe</p>
                <p class="text-[11px] text-slate-400">Préférence personnelle</p>
              </div>
              <button
                type="button"
                (click)="classNotifEnabled.set(!classNotifEnabled())"
                class="w-11 h-6 rounded-full transition-colors p-0.5 flex items-center"
                [class]="classNotifEnabled() ? 'bg-[#2454d6] justify-end' : 'bg-slate-300 justify-start'"
                aria-label="Activer les notifications de la classe"
              >
                <span class="w-5 h-5 rounded-full bg-white shadow-xs block"></span>
              </button>
            </div>

            <!-- À rendre bientôt -->
            <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <h3 class="text-xs font-bold text-[#182033] mb-3">À rendre bientôt</h3>
              @for (a of upcomingAssignments(); track a.id) {
                <div class="py-1.5 border-b border-slate-100 last:border-0">
                  <p class="text-xs font-semibold text-[#182033]">{{ a.titre }}</p>
                  <p class="text-[11px] text-orange-600 font-medium mt-0.5">
                    {{ a.dateLimite | date: 'dd MMM, HH:mm' }}
                  </p>
                </div>
              } @empty {
                <p class="text-xs text-slate-400">Aucun devoir à rendre bientôt.</p>
              }
            </div>
          </aside>

          <!-- Right Stream Feed (8 cols on lg) -->
          <div class="lg:col-span-8 space-y-4">
            @if (isTeacherView() || canPublish()) {
              <!-- Teacher / Authorized Publisher announcement composer -->
              <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                @if (!composerExpanded()) {
                  <button
                    type="button"
                    (click)="composerExpanded.set(true)"
                    class="w-full flex items-center gap-3 text-left"
                  >
                    <app-avatar [name]="auth.fullName() || 'Camille Dupont'" size="medium" />
                    <span class="flex-1 rounded-full bg-[#f5f7fb] px-4 py-2.5 text-xs text-slate-400 hover:bg-slate-100 transition-colors">
                      Annoncez quelque chose à votre classe...
                    </span>
                  </button>
                } @else {
                  <form (ngSubmit)="publish()" class="space-y-3">
                    <div class="flex items-center gap-2">
                      <select name="type" [(ngModel)]="type" class="input !w-36 !text-xs">
                        <option value="ANNONCE">Annonce</option>
                        @if (isTeacherView()) {
                          <option value="COURS">Cours</option>
                          <option value="DEVOIR">Devoir</option>
                        }
                      </select>
                      <input
                        name="titre"
                        [(ngModel)]="titre"
                        placeholder="Titre de la publication"
                        class="input !text-xs"
                        required
                      />
                    </div>
                    <textarea
                      name="contenu"
                      [(ngModel)]="contenu"
                      rows="3"
                      placeholder="Annoncez quelque chose à votre classe..."
                      class="input !text-xs"
                    ></textarea>
                    @if (type === 'DEVOIR') {
                      <div class="flex flex-wrap gap-2">
                        <input name="limite" type="datetime-local" [(ngModel)]="dateLimite" class="input !w-auto !text-xs" />
                        <input name="bareme" type="number" [(ngModel)]="bareme" placeholder="Barème (ex: 20)" class="input !w-36 !text-xs" />
                      </div>
                    }
                    @if (composerAttachment(); as att) {
                      <div class="inline-flex items-center gap-2 rounded-xl bg-[#eef3ff] border border-blue-200 px-3 py-1.5 text-xs">
                        <span class="text-[#2454d6]"><app-icon name="file" [size]="14" /></span>
                        <span class="font-bold text-[#182033]">{{ att.name }}</span>
                        <span class="text-[11px] text-slate-500">({{ att.sizeLabel }})</span>
                        <button type="button" (click)="composerAttachment.set(null)" class="text-slate-400 hover:text-red-600">
                          <app-icon name="close" [size]="14" />
                        </button>
                      </div>
                    }
                    <div class="flex items-center justify-between gap-2">
                      <label class="btn-light !text-xs cursor-pointer gap-1.5">
                        <app-icon name="file" [size]="14" /> Joindre un fichier
                        <input type="file" class="hidden" (change)="onPublicationFileSelected($event)" />
                      </label>
                      <div class="flex gap-2">
                        <button type="button" (click)="composerExpanded.set(false)" class="btn-light !text-xs">Annuler</button>
                        <button type="submit" class="btn !text-xs" [disabled]="!titre.trim()">Publier</button>
                      </div>
                    </div>
                  </form>
                }
              </div>
            } @else {
              <!-- Student restricted banner (exact Figma match) -->
              <div class="rounded-2xl bg-[#eef1f6] border border-slate-200/70 px-4 py-3 text-xs text-slate-500">
                Seuls les enseignants peuvent publier des annonces.
              </div>
            }

            <!-- Publications Feed -->
            @for (p of publications(); track p.id) {
              <app-publication-card [pub]="p" [isTeacher]="isTeacherView()" />
            } @empty {
              <div class="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-400">
                Aucune publication dans cette classe pour le moment.
              </div>
            }
          </div>
        </div>
      }

      <!-- ==================== TAB 2: TRAVAUX ET DEVOIRS ==================== -->
      @if (activeTab() === 'WORK') {
        <!-- Top Filter Bar: Tous | Cours | Devoir + Search + (+ Créer for Enseignant) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div class="bg-[#eef1f6] rounded-xl p-1 inline-flex items-center gap-1 self-start">
            <button
              type="button"
              (click)="workFilter.set('ALL')"
              [class]="
                workFilter() === 'ALL'
                  ? 'bg-white text-[#182033] font-bold shadow-2xs rounded-lg px-3.5 py-1.5 text-xs'
                  : 'text-slate-600 hover:text-[#182033] font-medium rounded-lg px-3.5 py-1.5 text-xs'
              "
            >
              Tous
            </button>
            <button
              type="button"
              (click)="workFilter.set('COURS')"
              [class]="
                workFilter() === 'COURS'
                  ? 'bg-white text-[#182033] font-bold shadow-2xs rounded-lg px-3.5 py-1.5 text-xs'
                  : 'text-slate-600 hover:text-[#182033] font-medium rounded-lg px-3.5 py-1.5 text-xs'
              "
            >
              Cours
            </button>
            <button
              type="button"
              (click)="workFilter.set('DEVOIR')"
              [class]="
                workFilter() === 'DEVOIR'
                  ? 'bg-white text-[#182033] font-bold shadow-2xs rounded-lg px-3.5 py-1.5 text-xs'
                  : 'text-slate-600 hover:text-[#182033] font-medium rounded-lg px-3.5 py-1.5 text-xs'
              "
            >
              Devoir
            </button>
          </div>

          <div class="flex items-center gap-2.5">
            <div class="relative flex-1 sm:w-64">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <app-icon name="search" [size]="15" />
              </span>
              <input
                type="text"
                [(ngModel)]="workSearch"
                placeholder="Rechercher un contenu..."
                class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs placeholder:text-slate-400"
              />
            </div>
            @if (isTeacherView()) {
              <button
                type="button"
                (click)="openCreateWorkModal()"
                class="bg-[#2454d6] hover:bg-[#1d46b8] text-white font-bold text-xs rounded-xl px-4 py-2 inline-flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <app-icon name="plus" [size]="15" /> Créer
              </button>
            }
          </div>
        </div>

        <!-- List of Cours & Devoirs (Figma card table) -->
        <div class="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          @for (item of filteredWorkItems(); track item.id) {
            <div>
              <button
                type="button"
                (click)="toggleWorkItem(item)"
                class="w-full text-left p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
              >
                <div class="flex items-center gap-3.5 min-w-0">
                  <!-- Icon Box -->
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    [class]="
                      item.type === 'DEVOIR'
                        ? 'bg-[#2454d6] text-white'
                        : 'bg-[#eef3ff] text-[#2454d6]'
                    "
                  >
                    <app-icon [name]="item.type === 'DEVOIR' ? 'file' : 'book'" [size]="18" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-[10px] font-extrabold uppercase tracking-wider text-[#2454d6]">
                      {{ item.type }}
                    </p>
                    <p class="text-sm font-bold text-[#182033] truncate">{{ item.titre }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">
                      @if (item.type === 'DEVOIR') {
                        @if (item.dateLimite) {
                          {{ item.dateLimite | date: 'dd MMM à HH:mm' }}
                        } @else {
                          Aucune date limite
                        }
                        @if (item.bareme) {
                          · {{ item.bareme }} points
                        }
                      } @else {
                        Publié le {{ item.datePublication | date: 'dd MMM' }}
                      }
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  @if (item.type === 'DEVOIR') {
                    @if (mySubmissionsByDevoir()[item.id]) {
                      <span class="text-[11px] font-bold rounded-full px-2.5 py-0.5 bg-emerald-50 text-emerald-700">
                        Remis
                      </span>
                    } @else {
                      <span class="text-[11px] font-bold rounded-full px-2.5 py-0.5 bg-orange-50 text-orange-700">
                        À faire
                      </span>
                    }
                  } @else {
                    <span class="text-[11px] font-bold rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-600">
                      Cours
                    </span>
                  }
                  <span class="text-slate-400">
                    <app-icon name="arrow" [size]="16" />
                  </span>
                </div>
              </button>

              <!-- Expanded Details / Submission inside Travaux et devoirs -->
              @if (expandedWorkId() === item.id) {
                <div class="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                  <app-publication-card [pub]="item" [isTeacher]="isTeacherView()" />
                </div>
              }
            </div>
          } @empty {
            <div class="p-8 text-center text-xs text-slate-400">
              Aucun cours ou devoir trouvé.
            </div>
          }
        </div>
      }

      <!-- ==================== TAB 3: MEMBRES ==================== -->
      @if (activeTab() === 'MEMBERS') {
        <div class="max-w-3xl space-y-6">
          <!-- Enseignants Card -->
          <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <div class="flex items-center gap-2 mb-4">
              <h2 class="text-base font-extrabold text-[#182033]">Enseignants</h2>
              <span class="text-xs font-bold text-slate-400">{{ teachers().length }}</span>
            </div>
            <div class="divide-y divide-slate-100">
              @for (m of teachers(); track m.id) {
                <div class="py-3 flex items-center gap-3">
                  <app-avatar [name]="m.prenomUtilisateur + ' ' + m.nomUtilisateur" size="medium" />
                  <div>
                    <p class="text-xs font-bold text-[#182033]">{{ m.prenomUtilisateur }} {{ m.nomUtilisateur }}</p>
                    <p class="text-[11px] text-slate-400">Enseignant</p>
                  </div>
                </div>
              } @empty {
                <p class="text-xs text-slate-400 py-2">Aucun enseignant.</p>
              }
            </div>
          </section>

          <!-- Étudiants Card -->
          <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <div class="flex items-center gap-2 mb-4">
              <h2 class="text-base font-extrabold text-[#182033]">Étudiants</h2>
              <span class="text-xs font-bold text-slate-400">{{ students().length }}</span>
            </div>
            <div class="divide-y divide-slate-100">
              @for (m of students(); track m.id) {
                <div class="py-3 flex items-center gap-3">
                  <app-avatar [name]="m.prenomUtilisateur + ' ' + m.nomUtilisateur" size="medium" />
                  <div>
                    <p class="text-xs font-bold text-[#182033]">{{ m.prenomUtilisateur }} {{ m.nomUtilisateur }}</p>
                    <p class="text-[11px] text-slate-400">Étudiant</p>
                  </div>
                </div>
              } @empty {
                <p class="text-xs text-slate-400 py-2">Aucun étudiant inscrit pour le moment.</p>
              }
            </div>
          </section>
        </div>
      }

      <!-- ==================== TAB 4: NOTES ==================== -->
      @if (activeTab() === 'GRADES') {
        @if (isTeacherView()) {
          <!-- ENSEIGNANT GRADEBOOK TABLE (Exact Figma match: Étudiant | Devoir 1 | Devoir 2 ...) -->
          <div class="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-100 text-xs text-slate-500">
                  <th class="py-3.5 px-5 font-semibold">Étudiant</th>
                  @for (d of assignments(); track d.id) {
                    <th class="py-3.5 px-5 font-semibold whitespace-nowrap">
                      {{ d.titre }}
                      <span class="text-slate-400 font-normal">/{{ d.bareme || 20 }}</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                @for (s of students(); track s.id) {
                  <tr class="hover:bg-slate-50/70">
                    <td class="py-3.5 px-5">
                      <div class="flex items-center gap-3">
                        <app-avatar [name]="s.prenomUtilisateur + ' ' + s.nomUtilisateur" size="small" />
                        <span class="font-bold text-[#182033]">{{ s.prenomUtilisateur }} {{ s.nomUtilisateur }}</span>
                      </div>
                    </td>
                    @for (d of assignments(); track d.id) {
                      <td class="py-3.5 px-5 font-semibold text-slate-700">
                        @if (gradeForStudent(d.id, s.utilisateurId); as rem) {
                          @if (rem.note != null) {
                            <span>{{ rem.note }}/{{ d.bareme || 20 }}</span>
                          } @else {
                            <span class="text-orange-600">Remis (à noter)</span>
                          }
                        } @else {
                          <span class="text-slate-300">—</span>
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="assignments().length + 1" class="p-8 text-center text-slate-400">
                      Aucun étudiant inscrit dans cette classe.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <!-- ÉTUDIANT GRADES SUMMARY (Exact Figma match: MOYENNE ACTUELLE card on left + assignment grades list on right) -->
          <div class="grid md:grid-cols-12 gap-6 items-start">
            <div class="md:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
              <p class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                MOYENNE ACTUELLE
              </p>
              <div class="mt-2 flex items-baseline gap-1">
                @if (studentAverageOut20() !== null) {
                  <span class="text-3xl font-extrabold text-[#2454d6]">
                    {{ studentAverageOut20() | number: '1.0-1' }}
                  </span>
                  <span class="text-sm font-bold text-slate-400">/20</span>
                } @else {
                  <span class="text-2xl font-extrabold text-slate-400">— /20</span>
                }
              </div>
              <p class="text-xs text-slate-500 mt-2">
                @if (studentAverageOut20() !== null) {
                  Très bon trimestre, continuez ainsi.
                } @else {
                  Aucune note corrigée pour le moment.
                }
              </p>
            </div>

            <div class="md:col-span-8 bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
              @for (d of assignments(); track d.id) {
                <div class="p-5 flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-[#182033]">{{ d.titre }}</p>
                    @if (mySubmissionsByDevoir()[d.id]; as sub) {
                      <p class="text-xs text-slate-500 mt-0.5">
                        {{ sub.correction || 'Devoir remis le ' + (sub.dateRemise | date: 'dd/MM/yyyy') }}
                      </p>
                    } @else {
                      <p class="text-xs text-slate-400 mt-0.5">Non remis</p>
                    }
                  </div>
                  <div class="shrink-0 text-right">
                    @if (mySubmissionsByDevoir()[d.id]; as sub) {
                      @if (sub.note != null) {
                        <span class="text-base font-extrabold text-[#2454d6]">{{ sub.note }}</span>
                        <span class="text-xs font-bold text-slate-400">/{{ d.bareme || 20 }}</span>
                      } @else {
                        <span class="text-xs font-semibold text-orange-600">En attente</span>
                      }
                    } @else {
                      <span class="text-xs text-slate-300">—/{{ d.bareme || 20 }}</span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center text-xs text-slate-400">
                  Aucun devoir évalué dans cette classe.
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Modal: Créer un Cours / Devoir (from Travaux et devoirs) -->
      @if (createWorkModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" (click)="createWorkModalOpen.set(false)">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-extrabold text-[#182033]">Créer un contenu</h3>
              <button type="button" (click)="createWorkModalOpen.set(false)" class="text-slate-400 hover:text-slate-600">
                <app-icon name="close" [size]="18" />
              </button>
            </div>
            <form (ngSubmit)="publish()" class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select name="wtype" [(ngModel)]="type" class="input !text-xs">
                  <option value="DEVOIR">Devoir</option>
                  <option value="COURS">Cours</option>
                  <option value="ANNONCE">Annonce</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Titre *</label>
                <input name="wtitre" [(ngModel)]="titre" placeholder="Ex: Créer une API REST avec Spring Boot" class="input !text-xs" required />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Instructions / Contenu</label>
                <textarea name="wcontenu" [(ngModel)]="contenu" rows="3" class="input !text-xs" placeholder="Détails du cours ou devoir..."></textarea>
              </div>
              @if (type === 'DEVOIR') {
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Date limite</label>
                    <input name="wlimite" type="datetime-local" [(ngModel)]="dateLimite" class="input !text-xs" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Points / Barème</label>
                    <input name="wbareme" type="number" [(ngModel)]="bareme" placeholder="20" class="input !text-xs" />
                  </div>
                </div>
              }
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Pièce jointe (PDF, support, exercice...)</label>
                @if (composerAttachment(); as att) {
                  <div class="inline-flex items-center gap-2 rounded-xl bg-[#eef3ff] border border-blue-200 px-3 py-1.5 text-xs">
                    <span class="text-[#2454d6]"><app-icon name="file" [size]="14" /></span>
                    <span class="font-bold text-[#182033]">{{ att.name }}</span>
                    <span class="text-[11px] text-slate-500">({{ att.sizeLabel }})</span>
                    <button type="button" (click)="composerAttachment.set(null)" class="text-slate-400 hover:text-red-600">
                      <app-icon name="close" [size]="14" />
                    </button>
                  </div>
                } @else {
                  <label class="btn-light !text-xs cursor-pointer gap-1.5 w-full">
                    <app-icon name="file" [size]="14" /> Choisir un fichier à joindre
                    <input type="file" class="hidden" (change)="onPublicationFileSelected($event)" />
                  </label>
                }
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" (click)="createWorkModalOpen.set(false)" class="btn-light !text-xs">Annuler</button>
                <button type="submit" class="btn !text-xs" [disabled]="!titre.trim()">Publier</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal: Paramètres de la classe (Teacher Gear button on banner) -->
      @if (settingsModalOpen()) {
        <div class="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" (click)="settingsModalOpen.set(false)">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-extrabold text-[#182033]">Paramètres de la classe</h3>
              <button type="button" (click)="settingsModalOpen.set(false)" class="text-slate-400 hover:text-slate-600">
                <app-icon name="close" [size]="18" />
              </button>
            </div>
            <div class="space-y-3 text-xs">
              <label class="flex justify-between items-center">
                <span class="font-semibold text-slate-700">Publication d'annonces</span>
                <select
                  class="input !w-auto !text-xs"
                  [ngModel]="c.parametres.publicationAnnonces"
                  (ngModelChange)="setting({ publicationAnnonces: $event })"
                >
                  <option value="TOUS_LES_MEMBRES">Tous les membres</option>
                  <option value="ENSEIGNANTS">Enseignants uniquement</option>
                </select>
              </label>
              <label class="flex justify-between items-center">
                <span class="font-semibold text-slate-700">Commentaires</span>
                <select
                  class="input !w-auto !text-xs"
                  [ngModel]="c.parametres.commentaires"
                  (ngModelChange)="setting({ commentaires: $event })"
                >
                  <option value="TOUS_LES_MEMBRES">Tous les membres</option>
                  <option value="ENSEIGNANTS">Enseignants uniquement</option>
                </select>
              </label>
              <label class="flex justify-between items-center">
                <span class="font-semibold text-slate-700">Code d'accès actif</span>
                <input
                  type="checkbox"
                  [ngModel]="c.parametres.codeAccesActif"
                  (ngModelChange)="setting({ codeAccesActif: $event })"
                />
              </label>
              <div class="pt-2 flex gap-2">
                <button type="button" class="btn-light flex-1 !text-xs" (click)="regen()">Régénérer le code</button>
                <button type="button" class="btn-light flex-1 !text-xs" (click)="archive(!c.archivee)">
                  {{ c.archivee ? 'Désarchiver' : 'Archiver la classe' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    } @else if (error()) {
      <p class="text-sm text-red-600 mt-4">{{ error() }}</p>
    }
  `,
})
export class ClassDetailComponent {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly store = inject(StoreService);
  private readonly fileStorage = inject(FileStorageService);

  readonly tabs: { id: ClassTab; label: string }[] = [
    { id: 'STREAM', label: "Fil d'actualité" },
    { id: 'WORK', label: 'Travaux et devoirs' },
    { id: 'MEMBERS', label: 'Membres' },
    { id: 'GRADES', label: 'Notes' },
  ];

  activeTab = signal<ClassTab>('STREAM');
  workFilter = signal<WorkFilter>('ALL');
  workSearch = '';
  expandedWorkId = signal<string | null>(null);

  classe = signal<Classe | null>(null);
  members = signal<Inscription[]>([]);
  publications = signal<Publication[]>([]);
  canAnnounce = signal(false);
  error = signal('');

  composerExpanded = signal(false);
  composerAttachment = signal<StoredFileAttachment | null>(null);
  createWorkModalOpen = signal(false);
  settingsModalOpen = signal(false);
  classNotifEnabled = signal(true);
  copied = signal(false);

  /** Submissions loaded for the Notes / Travaux tabs */
  allSubmissionsByDevoir = signal<Record<string, Remise[]>>({});
  mySubmissionsByDevoir = signal<Record<string, Remise | null>>({});

  type: TypePublication = 'ANNONCE';
  titre = '';
  contenu = '';
  dateLimite = '';
  bareme: number | null = null;

  /** Driven by the Enseignant / Étudiant toggle in the navbar so switching switches the class view immediately */
  isTeacherView = computed(() => this.store.viewRole() === 'ENSEIGNANT');
  canPublish = computed(() => !this.classe()?.archivee && (this.isTeacherView() || this.canAnnounce()));

  teachers = computed(() => this.members().filter((m) => m.role === 'ENSEIGNANT'));
  students = computed(() => this.members().filter((m) => m.role === 'ETUDIANT'));

  teacherDisplayName = computed(() => {
    const t = this.teachers()[0];
    return t ? `${t.prenomUtilisateur} ${t.nomUtilisateur}`.trim() : 'Enseignant';
  });

  assignments = computed(() => this.publications().filter((p) => p.type === 'DEVOIR'));

  upcomingAssignments = computed(() =>
    this.assignments()
      .filter((a) => a.dateLimite)
      .sort((a, b) => a.dateLimite!.localeCompare(b.dateLimite!))
      .slice(0, 3),
  );

  filteredWorkItems = computed(() => {
    const f = this.workFilter();
    const q = this.workSearch.trim().toLowerCase();
    return this.publications()
      .filter((p) => (f === 'ALL' ? p.type === 'COURS' || p.type === 'DEVOIR' : p.type === f))
      .filter((p) => !q || p.titre.toLowerCase().includes(q) || (p.contenu ?? '').toLowerCase().includes(q));
  });

  studentAverageOut20 = computed(() => {
    const devoirs = this.assignments();
    const mine = this.mySubmissionsByDevoir();
    let totalScore20 = 0;
    let count = 0;
    for (const d of devoirs) {
      const sub = mine[d.id];
      if (sub && sub.note != null) {
        const max = d.bareme && d.bareme > 0 ? d.bareme : 20;
        totalScore20 += (sub.note / max) * 20;
        count++;
      }
    }
    return count > 0 ? totalScore20 / count : null;
  });

  constructor() {
    effect(() => {
      void this.load(this.id());
    });
  }

  selectTab(tab: ClassTab): void {
    this.activeTab.set(tab);
    if (tab === 'GRADES' || tab === 'WORK') {
      void this.loadGradesData();
    }
  }

  toggleWorkItem(item: Publication): void {
    this.expandedWorkId.update((curr) => (curr === item.id ? null : item.id));
  }

  openCreateWorkModal(): void {
    this.type = 'DEVOIR';
    this.titre = '';
    this.contenu = '';
    this.dateLimite = '';
    this.bareme = 20;
    this.createWorkModalOpen.set(true);
  }

  copyCode(code: string): void {
    void navigator.clipboard?.writeText(code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  private async load(id: string): Promise<void> {
    this.error.set('');
    try {
      const [c, m, p, a] = await Promise.all([
        this.api.getClass(id),
        this.api.getMembers(id),
        this.api.getPublications(id),
        this.api.canAnnounce(id).catch(() => ({ allowed: false })),
      ]);
      this.classe.set(c);
      this.members.set(m);
      this.canAnnounce.set(a.allowed);
      this.publications.set([...p].sort((x, y) => y.datePublication.localeCompare(x.datePublication)));
      void this.loadGradesData();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  private async loadGradesData(): Promise<void> {
    const devoirs = this.assignments();
    if (!devoirs.length) return;
    const allMap: Record<string, Remise[]> = {};
    const myMap: Record<string, Remise | null> = {};

    await Promise.all(
      devoirs.map(async (d) => {
        const [subs, mine] = await Promise.all([
          this.api.getSubmissions(d.id).catch(() => [] as Remise[]),
          this.api.getMySubmission(d.id).catch(() => null),
        ]);
        allMap[d.id] = subs;
        myMap[d.id] = mine;
      }),
    );
    this.allSubmissionsByDevoir.set(allMap);
    this.mySubmissionsByDevoir.set(myMap);
  }

  gradeForStudent(devoirId: string, studentUid: string): Remise | undefined {
    return (this.allSubmissionsByDevoir()[devoirId] ?? []).find((r) => r.etudiantId === studentUid);
  }

  onPublicationFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const sizeLabel =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
        : `${Math.max(1, Math.round(file.size / 1024))} Ko`;
    const ext = (file.name.split('.').pop() || 'FICHIER').toUpperCase();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.composerAttachment.set({
        name: file.name,
        sizeLabel,
        typeLabel: ext,
        dataUrl,
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  async publish(): Promise<void> {
    try {
      const att = this.composerAttachment();
      let body = this.contenu.trim();
      if (att) {
        await this.fileStorage.saveFile(att.name, att.dataUrl);
        const marker = `[[FILE:${att.name}|${att.typeLabel}|${att.sizeLabel}]]`;
        body = body ? `${body}\n${marker}` : marker;
      }
      const created = await this.api.createPublication(this.id(), {
        type: this.type,
        titre: this.titre.trim(),
        contenu: body,
        dateLimite: this.type === 'DEVOIR' && this.dateLimite ? this.dateLimite : null,
        bareme: this.type === 'DEVOIR' ? this.bareme : null,
      });
      if (att && att.dataUrl) {
        await this.fileStorage.saveFile(`pub_${created.id}_${att.name}`, att.dataUrl);
      }
      this.titre = this.contenu = this.dateLimite = '';
      this.bareme = null;
      this.composerAttachment.set(null);
      this.composerExpanded.set(false);
      this.createWorkModalOpen.set(false);
      await this.load(this.id());
      void this.store.refresh();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async setting(s: Record<string, unknown>): Promise<void> {
    try {
      this.classe.set(await this.api.updateSettings(this.id(), s));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async regen(): Promise<void> {
    try {
      const r = await this.api.regenerateCode(this.id());
      this.classe.update((c) => (c ? { ...c, codeAcces: r.codeAcces } : c));
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async archive(v: boolean): Promise<void> {
    try {
      this.classe.set(await this.api.archive(this.id(), v));
      void this.store.refresh();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
