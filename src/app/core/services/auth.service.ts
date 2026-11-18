import { Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  NotificationPreference,
  Role,
  UserProfile,
} from '../models/classlink.models';
import { PREFERENCE_NAMES } from '../data/demo-data';
import { getFirebaseAuth, getFirestoreDb, isFirebaseEnabled } from '../firebase/firebase-app';
import { persist, stored } from '../utils/local-store';

const defaultProfile = (role: Role): UserProfile =>
  stored(`classlink-profile-${role}`, {
    first: 'Camille',
    last: 'Dupont',
    email: 'camille.dupont@exemple.fr',
    photo: '',
  });

const defaultPrefs = (): Record<string, NotificationPreference> =>
  Object.fromEntries(
    PREFERENCE_NAMES.map((n) => [n, { app: true, email: n !== 'Nouveau commentaire' }]),
  );

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly role = signal<Role>('enseignant');
  readonly profile = signal<UserProfile>(defaultProfile('enseignant'));
  readonly firebaseUser = signal<User | null>(null);

  constructor() {
    if (isFirebaseEnabled()) {
      const auth = getFirebaseAuth();
      if (auth) {
        onAuthStateChanged(auth, (user) => this.firebaseUser.set(user));
      }
    }
  }

  switchRole(role: Role): void {
    this.role.set(role);
    this.profile.set(defaultProfile(role));
  }

  async signIn(email: string, password: string): Promise<void> {
    if (!isFirebaseEnabled()) {
      this.profile.update((p) => ({ ...p, email }));
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth unavailable');
    await signInWithEmailAndPassword(auth, email, password);
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    if (!isFirebaseEnabled()) {
      const [first, ...rest] = displayName.split(' ');
      this.profile.set({
        first: first || 'Camille',
        last: rest.join(' ') || 'Dupont',
        email,
        photo: '',
      });
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth unavailable');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName });
    const db = getFirestoreDb();
    if (db) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName,
        email,
        role: 'étudiant',
        createdAt: Date.now(),
      });
    }
  }

  async signOut(): Promise<void> {
    if (!isFirebaseEnabled()) return;
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const role = this.role();
    persist(`classlink-profile-${role}`, profile);
    this.profile.set(profile);

    if (!isFirebaseEnabled()) return;
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    const user = auth?.currentUser;
    if (!user || !db) return;
    await fbUpdateProfile(user, {
      displayName: `${profile.first} ${profile.last}`,
      photoURL: profile.photo || null,
    });
    await setDoc(
      doc(db, 'users', user.uid),
      {
        first: profile.first,
        last: profile.last,
        email: profile.email,
        photo: profile.photo,
      },
      { merge: true },
    );
  }

  getPreferences(role = this.role()): Record<string, NotificationPreference> {
    return stored(`classlink-preferences-${role}`, defaultPrefs());
  }

  savePreferences(prefs: Record<string, NotificationPreference>, role = this.role()): void {
    persist(`classlink-preferences-${role}`, prefs);
    if (!isFirebaseEnabled()) return;
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    const uid = auth?.currentUser?.uid;
    if (!uid || !db) return;
    void setDoc(doc(db, 'users', uid, 'settings', 'notifications'), prefs, { merge: true });
  }

  async loadRemoteProfile(): Promise<UserProfile | null> {
    if (!isFirebaseEnabled()) return null;
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    const uid = auth?.currentUser?.uid;
    if (!uid || !db) return null;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  }
}
