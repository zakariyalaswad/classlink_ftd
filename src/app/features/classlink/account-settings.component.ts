import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { AuthService } from '../../core/services/auth.service';
import { PREFERENCE_NAMES } from '../../core/data/demo-data';
import { NotificationPreference, UserProfile } from '../../core/models/classlink.models';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { ToggleComponent } from '../../shared/toggle.component';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [FormsModule, IconComponent, AvatarComponent, ToggleComponent],
  template: `
    <div class="page settingsPage">
      <div class="settingsTitle">
        <div>
          <p class="eyebrow">VOTRE ESPACE</p>
          <h1>Paramètres du compte</h1>
          <p>Gérez vos informations et vos préférences personnelles.</p>
        </div>
      </div>

      @if (error()) {
        <div class="formError">{{ error() }}</div>
      }

      <section class="settingsCard">
        <div class="settingsSectionTitle">
          <span><app-icon name="users" /></span>
          <div>
            <h2>Profil</h2>
            <p>Vos informations visibles dans ClassLink.</p>
          </div>
        </div>
        <div class="profileFields">
          <div class="photoPreview">
            @if (profile().photo) {
              <img [src]="profile().photo" alt="Aperçu de la photo de profil" />
            } @else {
              <app-avatar [name]="profile().first + ' ' + profile().last" />
            }
            <label>
              Choisir une photo
              <input type="file" accept="image/*" (change)="onPhoto($event)" />
            </label>
          </div>
          <div class="formGrid">
            <label>Prénom<input [ngModel]="profile().first" (ngModelChange)="patchProfile({ first: $event })" /></label>
            <label>Nom<input [ngModel]="profile().last" (ngModelChange)="patchProfile({ last: $event })" /></label>
            <label class="wide">
              Adresse email
              <input readonly [ngModel]="profile().email" />
              <small>L’adresse email ne peut pas être modifiée dans ce prototype.</small>
            </label>
          </div>
        </div>
      </section>

      <section class="settingsCard">
        <div class="settingsSectionTitle">
          <span><app-icon name="gear" /></span>
          <div>
            <h2>Sécurité</h2>
            <p>Le changement de mot de passe est simulé et aucun mot de passe n’est enregistré.</p>
          </div>
        </div>
        <div class="formGrid three">
          <label>Mot de passe actuel<input type="password" [(ngModel)]="passwords.current" /></label>
          <label>Nouveau mot de passe<input type="password" [(ngModel)]="passwords.next" /></label>
          <label>Confirmation<input type="password" [(ngModel)]="passwords.confirm" /></label>
        </div>
      </section>

      <section class="settingsCard">
        <div class="settingsSectionTitle">
          <span><app-icon name="bell" /></span>
          <div>
            <h2>Notifications</h2>
            <p>Les emails sont simulés dans ce prototype.</p>
          </div>
        </div>
        <div class="preferenceTable">
          <div class="prefHead">
            <b>Type de notification</b>
            <b>Dans l’application</b>
            <b>Par email <small>(simulé)</small></b>
          </div>
          @for (n of preferenceNames; track n) {
            <div class="prefRow">
              <span>{{ n }}</span>
              <app-toggle
                [label]="n + ' dans l’application'"
                [checked]="prefs()[n].app"
                (onChange)="setPref(n, 'app', $event)"
              />
              <app-toggle
                [label]="n + ' par email simulé'"
                [checked]="prefs()[n].email"
                (onChange)="setPref(n, 'email', $event)"
              />
            </div>
          }
        </div>
      </section>

      <div class="settingsActions">
        <button class="btn ghost" type="button" (click)="state.view.set('dashboard')">Annuler</button>
        <button class="btn" type="button" (click)="save()">Enregistrer</button>
      </div>
    </div>
  `,
})
export class AccountSettingsComponent {
  readonly state = inject(ClassLinkStateService);
  private readonly auth = inject(AuthService);

  readonly preferenceNames = PREFERENCE_NAMES;
  readonly profile = signal<UserProfile>({ ...this.auth.profile() });
  readonly prefs = signal(this.auth.getPreferences());
  readonly error = signal('');
  passwords = { current: '', next: '', confirm: '' };

  patchProfile(partial: Partial<UserProfile>): void {
    this.profile.update((p) => ({ ...p, ...partial }));
  }

  setPref(name: string, key: keyof NotificationPreference, value: boolean): void {
    this.prefs.update((all) => ({
      ...all,
      [name]: { ...all[name]!, [key]: value },
    }));
  }

  onPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.patchProfile({ photo: URL.createObjectURL(file) });
  }

  async save(): Promise<void> {
    const profile = this.profile();
    if (!profile.first.trim() || !profile.last.trim()) {
      this.error.set('Le prénom et le nom sont obligatoires.');
      return;
    }
    if ((this.passwords.next || this.passwords.confirm) && this.passwords.next !== this.passwords.confirm) {
      this.error.set('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    if (this.passwords.next && this.passwords.next.length < 8) {
      this.error.set('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    const changedPassword = !!this.passwords.next;
    await this.auth.saveProfile(profile);
    this.auth.savePreferences(this.prefs());
    this.passwords = { current: '', next: '', confirm: '' };
    this.error.set('');
    this.state.notify(
      changedPassword
        ? 'Profil enregistré — changement de mot de passe simulé'
        : 'Paramètres du compte enregistrés',
    );
  }
}
