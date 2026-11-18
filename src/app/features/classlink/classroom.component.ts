import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { ASSIGNMENTS, STUDENTS, TEACHERS } from '../../core/data/demo-data';
import { Tab } from '../../core/models/classlink.models';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToggleComponent } from '../../shared/toggle.component';

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [FormsModule, IconComponent, AvatarComponent, ToggleComponent],
  template: `
    <div class="page classPage">
      @if (state.settings().archived) {
        <div class="archivedBanner">
          <b>Classe archivée — lecture seule</b>
          <span>Les publications, commentaires, remises et corrections sont désactivés.</span>
          @if (state.role() === 'enseignant') {
            <button type="button" (click)="state.modal.set('archive')">Restaurer la classe</button>
          }
        </div>
      }

      <div class="classHero">
        <div>
          <span>{{ state.settings().subject.toUpperCase() }} · 2024–2025</span>
          <h1>{{ state.settings().name }}</h1>
          <p>Sophie Martin · 26 membres</p>
        </div>
        <div class="heroActions">
          @if (state.role() === 'enseignant') {
            <button type="button" aria-label="Paramètres de la classe" (click)="state.view.set('classSettings')">
              <app-icon name="gear" />
            </button>
          }
          <div class="heroArt"><span>&lt;/&gt;</span></div>
        </div>
      </div>

      <div class="tabs">
        @for (t of tabs; track t[0]) {
          <button type="button" [class.active]="state.tab() === t[0]" (click)="state.tab.set(t[0])">{{ t[1] }}</button>
        }
      </div>

      @if (state.tab() === 'fil') {
        <div class="workspace">
          <aside>
            @if (state.role() === 'enseignant') {
              <div class="codeCard">
                <p>Code de la classe</p>
                <div>
                  <b>{{ state.settings().codeEnabled ? state.settings().code : 'Désactivé' }}</b>
                  @if (state.settings().codeEnabled) {
                    <button type="button" (click)="state.copyCode()"><app-icon name="copy" [size]="17" /></button>
                  }
                </div>
                <small>{{
                  state.settings().codeEnabled
                    ? 'Partagez ce code avec vos étudiants'
                    : 'Les inscriptions par code sont fermées'
                }}</small>
              </div>
            }
            <div class="notifyClass">
              <div>
                <b>Notifications de la classe</b>
                <small>Préférence personnelle</small>
              </div>
              <app-toggle
                [checked]="!state.muted()"
                label="Recevoir les notifications de cette classe"
                (onChange)="state.setClassMuted(!$event)"
              />
            </div>
            <div class="miniDue">
              <h3>À rendre bientôt</h3>
              <p>API REST avec Spring Boot</p>
              <span>Demain, 23:59</span>
            </div>
          </aside>

          <section class="feed">
            @if (canPost) {
              <div class="composer">
                <app-avatar name="Camille Dupont" />
                <button type="button" (click)="state.notify('Éditeur de publication ouvert')">
                  Annoncez quelque chose à votre classe...
                </button>
              </div>
            } @else {
              <div class="permissionNote">
                {{
                  state.settings().archived
                    ? 'Cette classe est archivée.'
                    : 'Seuls les enseignants peuvent publier des annonces.'
                }}
              </div>
            }

            <article class="post">
              <div class="postHead">
                <app-avatar name="Sophie Martin" />
                <div>
                  <b>Sophie Martin</b>
                  <span>Enseignante · 12 juin à 09:30</span>
                </div>
                @if (state.role() === 'enseignant') {
                  <button type="button" title="Modérer la publication"><app-icon name="more" /></button>
                }
              </div>
              <p>
                Bonjour à toutes et à tous,<br /><br />
                Le support du cours sur les API REST est disponible. Pensez à consulter les exemples avant de
                commencer le devoir.
              </p>
              <div class="attachment">
                <span><app-icon name="file" /></span>
                <div>
                  <b>Support_API_REST.pdf</b>
                  <small>PDF · 2,4 Mo</small>
                </div>
              </div>
              <div class="comments">
                <p>{{ state.comments().length }} commentaire{{ state.comments().length > 1 ? 's' : '' }}</p>
                @for (c of state.comments(); track $index) {
                  <div class="comment">
                    <app-avatar [name]="$index ? 'Camille Dupont' : 'Hugo Petit'" [small]="true" />
                    <div>
                      <b>{{ $index ? 'Camille Dupont' : 'Hugo Petit' }}</b>
                      <p>{{ c }}</p>
                    </div>
                    @if (state.role() === 'enseignant') {
                      <button class="moderate" type="button" (click)="removeComment($index)">Supprimer</button>
                    }
                  </div>
                }
                @if (canComment) {
                  <div class="commentInput">
                    <app-avatar name="Camille Dupont" [small]="true" />
                    <input
                      [ngModel]="state.comment()"
                      (ngModelChange)="state.comment.set($event)"
                      placeholder="Ajouter un commentaire..."
                      (keydown.enter)="addComment()"
                    />
                    <button type="button" (click)="addComment()"><app-icon name="send" [size]="18" /></button>
                  </div>
                } @else {
                  <div class="permissionNote small">
                    {{
                      state.settings().archived
                        ? 'Commentaires désactivés : classe archivée.'
                        : state.settings().comments === 'none'
                          ? 'Les commentaires sont désactivés pour tout le monde.'
                          : 'Seuls les enseignants peuvent commenter.'
                    }}
                  </div>
                }
              </div>
            </article>
          </section>
        </div>
      }

      @if (state.tab() === 'travaux') {
        <section class="coursework">
          <div class="workTools">
            <div class="segmented">
              @for (x of ['Tous', 'Cours', 'Devoir']; track x) {
                <button type="button" [class.active]="state.filter() === x" (click)="state.filter.set(x)">{{ x }}</button>
              }
            </div>
            <div class="search">
              <app-icon name="search" [size]="18" />
              <input
                placeholder="Rechercher un contenu..."
                [ngModel]="state.search()"
                (ngModelChange)="state.search.set($event)"
              />
            </div>
            @if (state.role() === 'enseignant' && !state.settings().archived) {
              <button class="btn" type="button" (click)="state.modal.set('work')">
                <app-icon name="plus" [size]="17" />Créer
              </button>
            }
          </div>
          <div class="workList">
            @for (a of state.filteredWork(); track a.title; let i = $index) {
              <article (click)="a.type === 'Devoir' && state.view.set('assignment')">
                <span class="workIcon" [class.soft]="a.type === 'Cours'">
                  <app-icon [name]="a.type === 'Cours' ? 'book' : 'file'" />
                </span>
                <div>
                  <small>{{ a.type.toUpperCase() }}</small>
                  <h3>{{ a.title }}</h3>
                  <p>{{ a.due }}{{ a.score ? ' · ' + a.score + ' points' : '' }}</p>
                </div>
                <span [class]="'status s' + i">{{ a.status }}</span>
                <app-icon name="arrow" />
              </article>
            }
          </div>
        </section>
      }

      @if (state.tab() === 'membres') {
        <section class="members">
          <div class="memberSection">
            <div class="memberTitle">
              <h2>Enseignants <span>3</span></h2>
              @if (state.role() === 'enseignant') {
                <button class="btn secondary" type="button" (click)="state.copyCode()">
                  <app-icon name="copy" [size]="16" />Copier le code
                </button>
              }
            </div>
            @for (n of teachers; track n) {
              <div class="member">
                <app-avatar [name]="n" />
                <div><b>{{ n }}</b><small>Enseignant</small></div>
              </div>
            }
          </div>
          <div class="memberSection">
            <div class="memberTitle"><h2>Étudiants <span>8</span></h2></div>
            @for (n of students; track n) {
              <div class="member">
                <app-avatar [name]="n" />
                <div><b>{{ n }}</b><small>Étudiant</small></div>
                @if (state.role() === 'enseignant') {
                  <button type="button" (click)="state.notify(n + ' a été retiré de la classe')">Retirer</button>
                }
              </div>
            }
          </div>
        </section>
      }

      @if (state.tab() === 'notes') {
        @if (state.role() === 'étudiant') {
          <section class="grades studentGrades">
            <div class="gradeSummary">
              <span>MOYENNE ACTUELLE</span>
              <b>16,5<small>/20</small></b>
              <p>Très bon trimestre, continuez ainsi.</p>
            </div>
            <div class="gradeRows">
              @for (a of devoirs; track a.title; let i = $index) {
                <div>
                  <div>
                    <b>{{ a.title }}</b>
                    <p>{{ i ? 'Bon raisonnement, syntaxe à revoir.' : 'Très bon travail, API bien structurée.' }}</p>
                  </div>
                  <strong>{{ i ? '17' : '16' }}<small>/{{ a.score }}</small></strong>
                </div>
              }
            </div>
          </section>
        } @else {
          <section class="grades">
            <div class="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>API REST <small>/20</small></th>
                    <th>Jointures SQL <small>/15</small></th>
                    <th>Collections <small>/20</small></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of students; track s; let i = $index) {
                    <tr>
                      <td><app-avatar [name]="s" [small]="true" /><b>{{ s }}</b></td>
                      <td>
                        @if (i === 3) {
                          <span class="ungraded">À corriger</span>
                        } @else {
                          {{ 14 + (i % 5) }}/20
                        }
                      </td>
                      <td>
                        @if (i === 5) {
                          —
                        } @else {
                          {{ 10 + (i % 5) }}/15
                        }
                      </td>
                      <td>
                        @if (i < 3) {
                          {{ 15 + i }}/20
                        } @else {
                          <span class="ungraded">Non remis</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class ClassroomComponent {
  readonly state = inject(ClassLinkStateService);
  readonly teachers = TEACHERS;
  readonly students = STUDENTS;
  readonly tabs: [Tab, string][] = [
    ['fil', 'Fil d’actualité'],
    ['travaux', 'Travaux et devoirs'],
    ['membres', 'Membres'],
    ['notes', 'Notes'],
  ];

  readonly devoirs = ASSIGNMENTS.filter((a) => a.type === 'Devoir');

  get canPost(): boolean {
    const s = this.state.settings();
    return !s.archived && (this.state.role() === 'enseignant' || s.announcements === 'all');
  }

  get canComment(): boolean {
    const s = this.state.settings();
    return !s.archived && s.comments !== 'none' && (this.state.role() === 'enseignant' || s.comments === 'all');
  }

  addComment(): void {
    const text = this.state.comment().trim();
    if (!text) return;
    this.state.comments.update((list) => [...list, text]);
    this.state.comment.set('');
  }

  removeComment(index: number): void {
    this.state.comments.update((list) => list.filter((_, i) => i !== index));
    this.state.notify('Commentaire supprimé');
  }
}
