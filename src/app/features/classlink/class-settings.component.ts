import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { ClassSettings } from '../../core/models/classlink.models';
import { IconComponent } from '../../shared/icon.component';
import { ToggleComponent } from '../../shared/toggle.component';

@Component({
  selector: 'app-class-settings',
  standalone: true,
  imports: [FormsModule, IconComponent, ToggleComponent],
  template: `
    <div class="page settingsPage">
      <button class="back" type="button" (click)="state.view.set('class')">
        <app-icon name="back" />Retour à la classe
      </button>

      <div class="settingsTitle">
        <div>
          <p class="eyebrow">DÉVELOPPEMENT WEB</p>
          <h1>Paramètres de la classe</h1>
          <p>Ces réglages s’appliquent immédiatement à tous les membres.</p>
        </div>
      </div>

      <section class="settingsCard">
        <div class="settingsSectionTitle">
          <span><app-icon name="book" /></span>
          <div>
            <h2>Informations générales</h2>
            <p>Identité et présentation de la classe.</p>
          </div>
        </div>
        <div class="formGrid">
          <label>Nom de la classe<input [ngModel]="s().name" (ngModelChange)="patch({ name: $event })" /></label>
          <label>Matière<input [ngModel]="s().subject" (ngModelChange)="patch({ subject: $event })" /></label>
          <label class="wide">
            Description
            <textarea [ngModel]="s().description" (ngModelChange)="patch({ description: $event })"></textarea>
          </label>
        </div>
      </section>

      <section class="settingsCard">
        <div class="settingsSectionTitle">
          <span><app-icon name="copy" /></span>
          <div>
            <h2>Code d’accès</h2>
            <p>Contrôlez les inscriptions à cette classe.</p>
          </div>
        </div>
        <div class="accessCode">
          <div>
            <b>{{ s().code }}</b>
            <button type="button" (click)="copy()">
              <app-icon name="copy" [size]="16" />Copier
            </button>
            <button class="btn secondary" type="button" (click)="state.modal.set('code')">Régénérer</button>
          </div>
          <label>
            <span>
              <b>Autoriser l’inscription par code</b>
              <small>Un code désactivé ou régénéré ne peut plus être utilisé.</small>
            </span>
            <app-toggle
              label="Autoriser l’inscription par code"
              [checked]="s().codeEnabled"
              (onChange)="patch({ codeEnabled: $event })"
            />
          </label>
        </div>
      </section>

      <section class="settingsCard">
        <div class="settingsSectionTitle">
          <span><app-icon name="users" /></span>
          <div>
            <h2>Permissions</h2>
            <p>Définissez qui peut participer au fil d’actualité.</p>
          </div>
        </div>
        <div class="permissionGrid">
          <fieldset>
            <legend>Qui peut publier des annonces ?</legend>
            <label>
              <input
                type="radio"
                [checked]="s().announcements === 'teachers'"
                (change)="patch({ announcements: 'teachers' })"
              />
              Enseignants uniquement
            </label>
            <label>
              <input
                type="radio"
                [checked]="s().announcements === 'all'"
                (change)="patch({ announcements: 'all' })"
              />
              Tous les membres
            </label>
          </fieldset>
          <fieldset>
            <legend>Qui peut commenter ?</legend>
            <label>
              <input
                type="radio"
                [checked]="s().comments === 'teachers'"
                (change)="patch({ comments: 'teachers' })"
              />
              Enseignants uniquement
            </label>
            <label>
              <input type="radio" [checked]="s().comments === 'all'" (change)="patch({ comments: 'all' })" />
              Tous les membres
            </label>
            <label>
              <input type="radio" [checked]="s().comments === 'none'" (change)="patch({ comments: 'none' })" />
              Personne
            </label>
          </fieldset>
        </div>
      </section>

      <section class="settingsCard dangerZone">
        <div>
          <h2>Archivage</h2>
          <p>
            {{
              s().archived
                ? 'Cette classe est archivée et en lecture seule.'
                : 'Archivez cette classe lorsque le cours est terminé.'
            }}
          </p>
        </div>
        <button class="btn secondary" type="button" (click)="state.modal.set('archive')">
          {{ s().archived ? 'Restaurer la classe' : 'Archiver la classe' }}
        </button>
      </section>

      <div class="settingsActions">
        <button class="btn ghost" type="button" (click)="state.view.set('class')">Annuler</button>
        <button class="btn" type="button" (click)="state.saveSettings(s())">Enregistrer</button>
      </div>
    </div>
  `,
})
export class ClassSettingsComponent {
  readonly state = inject(ClassLinkStateService);
  s = this.state.settings;

  patch(partial: Partial<ClassSettings>): void {
    this.state.updateSettings(partial);
  }

  copy(): void {
    void navigator.clipboard?.writeText(this.s().code);
    this.state.notify('Code copié');
  }
}
