import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <main class="min-h-screen flex items-center justify-center p-4">
      <form (ngSubmit)="submit()" class="card w-full max-w-sm space-y-3">
        <h1 class="text-2xl font-extrabold text-blue-700">ClassLink</h1>
        <p class="text-sm text-slate-500">{{ mode() === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte' }}</p>
        @if (mode() === 'signup') {
          <input name="prenom" [(ngModel)]="prenom" [disabled]="busy()" placeholder="Prénom" class="input" required />
          <input name="nom" [(ngModel)]="nom" [disabled]="busy()" placeholder="Nom" class="input" required />
        }
        <input name="email" type="email" [(ngModel)]="email" [disabled]="busy()" placeholder="Email" class="input" required />
        <input name="pwd" type="password" [(ngModel)]="password" [disabled]="busy()" placeholder="Mot de passe" class="input" required minlength="6" />
        @if (error()) { <p class="text-sm text-red-600">{{ error() }}</p> }
        <button type="submit" class="btn w-full" [disabled]="busy()">
          @if (formBusy()) {
            <app-icon name="spinner" [size]="16" />
          }
          <span>{{ mode() === 'login' ? (formBusy() ? 'Connexion...' : 'Se connecter') : (formBusy() ? 'Inscription...' : "S'inscrire") }}</span>
        </button>
        <div class="flex items-center gap-2 text-xs text-slate-400"><hr class="flex-1" />ou<hr class="flex-1" /></div>
        <button type="button" class="btn-light w-full gap-2" (click)="google()" [disabled]="busy()">
          @if (googleBusy()) {
            <app-icon name="spinner" [size]="16" />
          } @else {
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.6l-7.5-5.8c-2 1.4-4.7 2.2-7.8 2.2-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          }
          <span>{{ googleBusy() ? 'Connexion Google...' : 'Continuer avec Google' }}</span>
        </button>
        <button
          type="button"
          class="text-sm text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed w-full"
          (click)="toggle()"
          [disabled]="busy()"
        >
          {{ mode() === 'login' ? 'Pas de compte ? Inscription' : 'Déjà inscrit ? Connexion' }}
        </button>
        <a routerLink="/" class="block text-center text-xs text-slate-400 hover:underline">← Retour à l'accueil</a>
      </form>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  mode = signal<'login' | 'signup'>(this.route.snapshot.queryParamMap.get('mode') === 'signup' ? 'signup' : 'login');
  formBusy = signal(false);
  googleBusy = signal(false);
  busy = computed(() => this.formBusy() || this.googleBusy());
  error = signal('');
  email = '';
  password = '';
  nom = '';
  prenom = '';

  async google(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    this.googleBusy.set(true);
    try {
      await this.auth.loginWithGoogle();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.googleBusy.set(false);
    }
  }

  toggle(): void {
    if (this.busy()) return;
    this.mode.update((m) => (m === 'login' ? 'signup' : 'login'));
    this.error.set('');
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    this.formBusy.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.email.trim(), this.password);
      } else {
        if (!this.nom.trim() || !this.prenom.trim()) throw new Error('Nom et prénom requis.');
        await this.auth.signup(this.prenom.trim(), this.nom.trim(), this.email.trim(), this.password);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.formBusy.set(false);
    }
  }
}
