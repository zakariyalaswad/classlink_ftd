import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { STUDENTS } from '../../core/data/demo-data';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'app-assignment',
  standalone: true,
  imports: [FormsModule, IconComponent, AvatarComponent],
  template: `
    <div class="page assignment">
      <button class="back" type="button" (click)="state.view.set('class')">
        <app-icon name="back" />Retour aux travaux
      </button>

      <div class="assignmentHead">
        <span class="workIcon"><app-icon name="file" /></span>
        <div>
          <span>DEVOIR · 20 POINTS</span>
          <h1>Créer une API REST avec Spring Boot</h1>
          <p>Publié par Sophie Martin · Date limite : 18 juin à 23:59</p>
        </div>
        <span class="bigStatus" [class.done]="state.submitted()">{{ state.submitted() ? 'Remis' : 'À faire' }}</span>
      </div>

      @if (state.role() === 'étudiant') {
        <div class="assignmentGrid">
          <article class="instructions">
            <h2>Consignes</h2>
            <p>
              Concevez une API REST complète permettant de gérer une bibliothèque. Votre application devra proposer
              les opérations CRUD pour les livres et les auteurs.
            </p>
            <ul>
              <li>Utiliser Spring Boot et Spring Data JPA</li>
              <li>Valider les données entrantes</li>
              <li>Gérer les erreurs avec des réponses adaptées</li>
              <li>Documenter les endpoints principaux</li>
            </ul>
            <div class="attachment">
              <span><app-icon name="file" /></span>
              <div>
                <b>Cahier_des_charges_API.pdf</b>
                <small>PDF · 840 Ko</small>
              </div>
            </div>
          </article>

          <aside class="myWork">
            <div>
              <h2>Mon travail</h2>
              <span [class.done]="state.submitted()">{{ state.submitted() ? 'Remis' : 'À faire' }}</span>
            </div>
            <label>
              Réponse
              <textarea
                [disabled]="state.settings().archived"
                [ngModel]="state.answer()"
                (ngModelChange)="state.answer.set($event)"
                placeholder="Ajoutez une note pour votre enseignante..."
              ></textarea>
            </label>
            <label class="filePicker">
              <app-icon name="plus" />Ajouter un fichier
              <input type="file" [disabled]="state.settings().archived" (change)="onFile($event)" />
            </label>
            <small>
              {{
                state.settings().archived
                  ? 'Remise désactivée : cette classe est archivée.'
                  : 'L’ajout de fichier est simulé dans cette démo.'
              }}
            </small>
            @if (!state.settings().archived) {
              <button class="btn" type="button" (click)="state.modal.set('confirm')">
                {{ state.submitted() ? 'Renvoyer le devoir' : 'Remettre le devoir' }}
              </button>
            }
            @if (state.submitted()) {
              <div class="result">
                <b>Note : 16/20</b>
                <p>{{ state.feedback() }}</p>
              </div>
            }
          </aside>
        </div>
      } @else {
        <div class="teacherSubmissions">
          <aside>
            <h3>Copies</h3>
            <div class="submissionStats">
              <div><b>6</b><span>Remis</span></div>
              <div><b>2</b><span>Manquants</span></div>
            </div>
            <div class="studentList">
              @for (s of students; track s; let i = $index) {
                <button
                  type="button"
                  [class.active]="state.selectedStudent() === s"
                  (click)="state.selectedStudent.set(s)"
                >
                  <app-avatar [name]="s" [small]="true" />
                  <span>
                    <b>{{ s }}</b>
                    <small>{{ i > 5 ? 'Non remis' : i < 3 ? 'Noté' : 'À corriger' }}</small>
                  </span>
                </button>
              }
            </div>
          </aside>

          <article class="correction">
            <div class="correctionHead">
              <div>
                <h2>{{ state.selectedStudent() }}</h2>
                <p>Remis le 17 juin à 18:42 · Dans les délais</p>
              </div>
              <span>{{ state.settings().archived ? 'Lecture seule' : 'À corriger' }}</span>
            </div>
            <h3>Réponse de l’étudiant</h3>
            <p>
              J’ai réalisé l’API demandée avec les entités Livre et Auteur, les contrôleurs REST et une gestion
              centralisée des exceptions.
            </p>
            <div class="attachment">
              <span><app-icon name="file" /></span>
              <div>
                <b>projet-bibliotheque.zip</b>
                <small>ZIP · 1,8 Mo</small>
              </div>
            </div>
            <div class="grading">
              <label>
                Note sur 20
                <input
                  type="number"
                  min="0"
                  max="20"
                  [disabled]="state.settings().archived"
                  [ngModel]="state.grade()"
                  (ngModelChange)="state.grade.set($event)"
                />
              </label>
              <label>
                Commentaire
                <textarea
                  [disabled]="state.settings().archived"
                  [ngModel]="state.feedback()"
                  (ngModelChange)="state.feedback.set($event)"
                ></textarea>
              </label>
              @if (!state.settings().archived) {
                <button class="btn" type="button" (click)="state.addGradeNotice()">Enregistrer la correction</button>
              }
            </div>
          </article>
        </div>
      }
    </div>
  `,
})
export class AssignmentComponent {
  readonly state = inject(ClassLinkStateService);
  readonly students = STUDENTS;

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.state.notify(`${file.name} (${Math.round(file.size / 1024)} Ko) sélectionné — envoi simulé`);
  }
}
