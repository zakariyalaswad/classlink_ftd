import { Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Notice, Role } from '../models/classlink.models';
import { initialNotices, studentNoticesSeed } from '../data/demo-data';
import { getFirestoreDb, isFirebaseEnabled } from '../firebase/firebase-app';
import { persist, stored } from '../utils/local-store';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notices = signal<Notice[]>(
    stored('classlink-notices-enseignant', initialNotices),
  );

  loadForRole(role: Role): Notice[] {
    const seed = role === 'enseignant' ? initialNotices : studentNoticesSeed();
    const list = stored(`classlink-notices-${role}`, seed);
    this.notices.set(list);
    return list;
  }

  persistForRole(role: Role, notices = this.notices()): void {
    persist(`classlink-notices-${role}`, notices);
    this.notices.set(notices);
  }

  markRead(id: number): void {
    this.notices.update((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllRead(): void {
    this.notices.update((ns) => ns.map((n) => ({ ...n, read: true })));
  }

  addNotice(notice: Omit<Notice, 'id'> & { id?: number }): Notice {
    const full: Notice = { ...notice, id: notice.id ?? Date.now() };
    this.notices.update((ns) => [full, ...ns]);
    return full;
  }

  /** Push a grade notice into the student inbox (demo or Firebase). */
  pushGradeNotice(classroom: string, grade: string | number, studentMuted: boolean): void {
    if (studentMuted) return;
    const notice: Notice = {
      id: Date.now(),
      title: 'Note publiée',
      classroom,
      text: `Votre devoir a été noté : ${grade}/20.`,
      time: 'À l’instant',
      read: false,
      target: 'assignment',
    };

    if (!isFirebaseEnabled()) {
      const studentNotices = stored<Notice[]>(
        'classlink-notices-étudiant',
        studentNoticesSeed(),
      );
      persist('classlink-notices-étudiant', [notice, ...studentNotices]);
      return;
    }

    const db = getFirestoreDb();
    if (!db) return;
    // In production, target the real student uid instead of a fixed path.
    void setDoc(doc(collection(db, 'notifications', 'étudiant-demo', 'items')), notice);
  }

  async syncFromFirebase(uid: string): Promise<Notice[]> {
    if (!isFirebaseEnabled()) return this.notices();
    const db = getFirestoreDb();
    if (!db) return this.notices();
    const snap = await getDocs(collection(db, 'notifications', uid, 'items'));
    const list = snap.docs.map((d) => ({ id: Number(d.id) || Date.now(), ...d.data() }) as Notice);
    if (list.length) this.notices.set(list);
    return this.notices();
  }

  async pushRemoteNotice(uid: string, notice: Notice): Promise<void> {
    if (!isFirebaseEnabled()) return;
    const db = getFirestoreDb();
    if (!db) return;
    await setDoc(doc(db, 'notifications', uid, 'items', String(notice.id)), notice);
  }

  async markAllReadRemote(uid: string): Promise<void> {
    this.markAllRead();
    if (!isFirebaseEnabled()) return;
    const db = getFirestoreDb();
    if (!db) return;
    const snap = await getDocs(collection(db, 'notifications', uid, 'items'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }

  async markReadRemote(uid: string, id: number): Promise<void> {
    this.markRead(id);
    if (!isFirebaseEnabled()) return;
    const db = getFirestoreDb();
    if (!db) return;
    await updateDoc(doc(db, 'notifications', uid, 'items', String(id)), { read: true });
  }
}
