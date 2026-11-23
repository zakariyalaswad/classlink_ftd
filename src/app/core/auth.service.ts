import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, updateProfile, User,
} from 'firebase/auth';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { Utilisateur } from './models';

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
  'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
  'auth/operation-not-allowed': "La connexion par email n'est pas activée dans Firebase Authentication.",
  'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard.',
  'auth/popup-closed-by-user': 'Connexion Google annulée.',
  'auth/popup-blocked': 'La fenêtre Google a été bloquée par le navigateur.',
  'auth/cancelled-popup-request': 'Connexion Google annulée.',
  'auth/unauthorized-domain': "Ce domaine n'est pas autorisé dans Firebase Authentication.",
  'auth/network-request-failed': 'Problème de réseau.',
};

/** Firebase Authentication (email/password) + application profile held by the API. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly auth = getAuth(initializeApp(environment.firebase));

  readonly user = signal<User | null>(null);
  readonly profile = signal<Utilisateur | null>(null);

  /** Resolves once the initial Firebase session has been restored. */
  readonly ready: Promise<void>;

  constructor() {
    let first = true;
    this.ready = new Promise((resolve) => {
      onAuthStateChanged(this.auth, async (u) => {
        this.user.set(u);
        if (u) {
          await this.loadProfile(u).catch(() => undefined);
        } else {
          this.profile.set(null);
        }
        if (first) {
          first = false;
          resolve();
        }
      });
    });
  }

  async idToken(): Promise<string | null> {
    return (await this.auth.currentUser?.getIdToken()) ?? null;
  }

  private async loadProfile(u: User): Promise<void> {
    try {
      const p = await this.api.me();
      const localPhoto = this.localPhoto(u.uid);
      this.profile.set(localPhoto && !p.photoUrl ? { ...p, photoUrl: localPhoto } : p);
    } catch {
      // Account created in Firebase but profile missing (e.g. interrupted sign-up): recreate it.
      const [prenom, ...rest] = (u.displayName || u.email?.split('@')[0] || 'Utilisateur').split(' ');
      const p = await this.api.register(rest.join(' ') || prenom, prenom);
      const localPhoto = this.localPhoto(u.uid);
      this.profile.set(localPhoto && !p.photoUrl ? { ...p, photoUrl: localPhoto } : p);
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (e) {
      throw this.friendly(e);
    }
    await this.settled();
    await this.router.navigateByUrl('/home');
  }

  /** Google sign-in; the application profile is created on first login from the Google display name. */
  async loginWithGoogle(): Promise<void> {
    try {
      const cred = await signInWithPopup(this.auth, new GoogleAuthProvider());
      this.user.set(cred.user);
      await this.loadProfile(cred.user);
    } catch (e) {
      throw this.friendly(e);
    }
    await this.router.navigateByUrl('/home');
  }

  async signup(prenom: string, nom: string, email: string, password: string): Promise<void> {
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(cred.user, { displayName: `${prenom} ${nom}` });
      this.user.set(cred.user);
      this.profile.set(await this.api.register(nom, prenom));
    } catch (e) {
      throw this.friendly(e);
    }
    await this.router.navigateByUrl('/home');
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.user.set(null);
    this.profile.set(null);
    await this.router.navigateByUrl('/login');
  }

  async updateProfile(nom: string, prenom: string, photoUrl?: string | null): Promise<void> {
    const uid = this.user()?.uid;
    if (uid && photoUrl !== undefined) {
      try {
        if (photoUrl) localStorage.setItem(`classlink_photo_${uid}`, photoUrl);
        else localStorage.removeItem(`classlink_photo_${uid}`);
      } catch {
        /* ignore quota errors */
      }
    }
    const updated = await this.api.updateProfile(nom, prenom, photoUrl);
    const finalPhoto = photoUrl !== undefined ? photoUrl : (updated.photoUrl ?? (uid ? this.localPhoto(uid) : null));
    this.profile.set({ ...updated, photoUrl: finalPhoto });
  }

  photoUrl(): string | null {
    const p = this.profile();
    if (p?.photoUrl) return p.photoUrl;
    const uid = this.user()?.uid;
    return uid ? this.localPhoto(uid) : null;
  }

  private localPhoto(uid: string): string | null {
    try {
      return localStorage.getItem(`classlink_photo_${uid}`);
    } catch {
      return null;
    }
  }

  fullName(): string {
    const p = this.profile();
    return p ? `${p.prenom} ${p.nom}` : '';
  }

  private async settled(): Promise<void> {
    // wait until onAuthStateChanged has loaded the profile
    for (let i = 0; i < 50 && !this.profile(); i++) await new Promise((r) => setTimeout(r, 100));
  }

  private friendly(e: unknown): Error {
    const code = (e as { code?: string }).code;
    return new Error((code && FIREBASE_ERRORS[code]) || (e as Error).message || 'Erreur inconnue');
  }
}