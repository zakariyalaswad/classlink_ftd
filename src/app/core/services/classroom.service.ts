import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ClassItem, ClassSettings, CreateClassPayload, Role } from '../models/classlink.models';
import { CLASSES, defaultSettings } from '../data/demo-data';
import { getFirestoreDb, isFirebaseEnabled } from '../firebase/firebase-app';
import { persist, stored } from '../utils/local-store';

@Injectable({ providedIn: 'root' })
export class ClassroomService {
  readonly classes = signal<ClassItem[]>([...CLASSES]);
  readonly settings = signal<ClassSettings>(stored('classlink-class-1', defaultSettings));

  constructor() {
    // keep settings persisted like the React prototype
  }

  listClasses(): ClassItem[] {
    return this.classes();
  }

  async fetchClassesFromFirebase(uid: string): Promise<ClassItem[]> {
    if (!isFirebaseEnabled()) return this.listClasses();
    const db = getFirestoreDb();
    if (!db) return this.listClasses();
    const memberships = await getDocs(query(collection(db, 'classMembers'), where(`users.${uid}`, '!=', null)));
    // Prefer explicit memberships collection pattern: classMembers/{classId}/users/{uid}
    const classSnap = await getDocs(collection(db, 'classes'));
    const items: ClassItem[] = classSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data['name'] ?? data['title'] ?? '',
        subject: data['subject'] ?? '',
        teacher: data['teacher'] ?? '',
        members: data['members'] ?? 0,
        due: data['due'] ?? '',
        color: data['color'] ?? 'blue',
        code: data['code'] ?? '',
        role: (data['role'] as Role) ?? 'étudiant',
      };
    });
    if (items.length) this.classes.set(items);
    void memberships;
    return this.classes();
  }

  getClassSettings(classId: string | number = 1): ClassSettings {
    return stored(`classlink-class-${classId}`, this.settings());
  }

  saveClassSettings(settings: ClassSettings, classId: string | number = 1): void {
    this.settings.set(settings);
    persist(`classlink-class-${classId}`, settings);
    if (!isFirebaseEnabled()) return;
    const db = getFirestoreDb();
    if (!db) return;
    void setDoc(
      doc(db, 'classes', String(classId)),
      {
        name: settings.name,
        subject: settings.subject,
        description: settings.description,
        code: settings.code,
        codeEnabled: settings.codeEnabled,
        announcements: settings.announcements,
        comments: settings.comments,
        archived: settings.archived,
      },
      { merge: true },
    );
  }

  async createClass(payload: CreateClassPayload, teacherName = 'Camille Dupont'): Promise<ClassItem> {
    const code = `CL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const item: ClassItem = {
      id: Date.now(),
      title: payload.name,
      subject: payload.subject,
      teacher: teacherName,
      members: 1,
      due: 'Aucune échéance',
      color: 'blue',
      code,
      role: 'enseignant',
    };

    if (isFirebaseEnabled()) {
      const db = getFirestoreDb();
      if (db) {
        const ref = await addDoc(collection(db, 'classes'), {
          name: payload.name,
          subject: payload.subject,
          description: payload.description,
          teacher: teacherName,
          members: 1,
          code,
          codeEnabled: true,
          announcements: 'teachers',
          comments: 'all',
          archived: false,
          color: 'blue',
          createdAt: Date.now(),
        });
        item.id = ref.id;
      }
    }

    this.classes.update((list) => [item, ...list]);
    return item;
  }

  async joinClass(code: string, userName = 'Camille Dupont'): Promise<boolean> {
    const settings = this.settings();
    const normalized = code.trim().toUpperCase();

    if (!isFirebaseEnabled()) {
      if (!settings.codeEnabled || settings.archived || normalized !== settings.code) {
        return false;
      }
      return true;
    }

    const db = getFirestoreDb();
    if (!db) return false;
    const snap = await getDocs(query(collection(db, 'classes'), where('code', '==', normalized)));
    if (snap.empty) return false;
    const classDoc = snap.docs[0]!;
    const data = classDoc.data();
    if (!data['codeEnabled'] || data['archived']) return false;
    await setDoc(doc(db, 'classMembers', classDoc.id, 'users', userName), {
      role: 'étudiant',
      joinedAt: Date.now(),
    });
    await updateDoc(doc(db, 'classes', classDoc.id), {
      members: (data['members'] ?? 0) + 1,
    });
    return true;
  }

  regenerateCode(classId: string | number = 1): string {
    const code = `CL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const next = { ...this.settings(), code };
    this.saveClassSettings(next, classId);
    return code;
  }

  setArchived(archived: boolean, classId: string | number = 1): void {
    this.saveClassSettings({ ...this.settings(), archived }, classId);
  }

  getMuted(role: Role, classId: string | number = 1): boolean {
    return stored(`classlink-muted-${role}-${classId}`, false);
  }

  setMuted(role: Role, muted: boolean, classId: string | number = 1): void {
    persist(`classlink-muted-${role}-${classId}`, muted);
  }

  async loadSettingsFromFirebase(classId: string): Promise<ClassSettings | null> {
    if (!isFirebaseEnabled()) return null;
    const db = getFirestoreDb();
    if (!db) return null;
    const snap = await getDoc(doc(db, 'classes', classId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const settings: ClassSettings = {
      name: data['name'] ?? '',
      subject: data['subject'] ?? '',
      description: data['description'] ?? '',
      code: data['code'] ?? '',
      codeEnabled: data['codeEnabled'] ?? true,
      announcements: data['announcements'] ?? 'teachers',
      comments: data['comments'] ?? 'all',
      archived: data['archived'] ?? false,
    };
    this.settings.set(settings);
    return settings;
  }
}
