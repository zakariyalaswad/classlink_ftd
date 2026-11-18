import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AssignmentItem, CreateAssignmentPayload } from '../models/classlink.models';
import { ASSIGNMENTS } from '../data/demo-data';
import {
  getFirebaseStorage,
  getFirestoreDb,
  isFirebaseEnabled,
} from '../firebase/firebase-app';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  readonly assignments = signal<AssignmentItem[]>([...ASSIGNMENTS]);
  readonly submitted = signal(false);
  readonly answer = signal('');
  readonly grade = signal('16');
  readonly feedback = signal(
    'Très bon travail. La gestion des erreurs peut encore être améliorée.',
  );

  listAssignments(_classId: string | number = 1): AssignmentItem[] {
    return this.assignments();
  }

  async fetchAssignments(classId: string): Promise<AssignmentItem[]> {
    if (!isFirebaseEnabled()) return this.listAssignments(classId);
    const db = getFirestoreDb();
    if (!db) return this.listAssignments(classId);
    const snap = await getDocs(collection(db, 'classes', classId, 'assignments'));
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data['title'] ?? '',
        type: data['type'] ?? 'Devoir',
        due: data['due'] ?? '',
        score: data['score'] ?? data['maxScore'] ?? 0,
        status: data['status'] ?? 'Nouveau',
      } as AssignmentItem;
    });
    if (items.length) this.assignments.set(items);
    return this.assignments();
  }

  async createAssignment(
    classId: string | number,
    payload: CreateAssignmentPayload,
  ): Promise<AssignmentItem> {
    const item: AssignmentItem = {
      id: String(Date.now()),
      title: payload.title,
      type: payload.type,
      due: payload.dueDate ? `Date limite : ${payload.dueDate}` : 'Publié aujourd’hui',
      score: payload.maxScore ?? 0,
      status: 'Nouveau',
    };

    if (isFirebaseEnabled()) {
      const db = getFirestoreDb();
      if (db) {
        const refDoc = await addDoc(collection(db, 'classes', String(classId), 'assignments'), {
          ...payload,
          createdAt: Date.now(),
          status: 'Nouveau',
        });
        item.id = refDoc.id;
      }
    }

    this.assignments.update((list) => [item, ...list]);
    return item;
  }

  async submitWork(
    classId: string | number,
    assignmentId: string,
    studentId: string,
    answer: string,
    file?: File | null,
  ): Promise<void> {
    this.answer.set(answer);
    this.submitted.set(true);

    if (!isFirebaseEnabled()) return;
    const db = getFirestoreDb();
    if (!db) return;

    let fileUrl = '';
    if (file) {
      const storage = getFirebaseStorage();
      if (storage) {
        const storageRef = ref(
          storage,
          `submissions/${classId}/${assignmentId}/${studentId}/${file.name}`,
        );
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      }
    }

    await setDoc(
      doc(db, 'classes', String(classId), 'assignments', assignmentId, 'submissions', studentId),
      {
        answer,
        fileUrl,
        submittedAt: Date.now(),
        status: 'Remis',
      },
      { merge: true },
    );
  }

  async saveGrade(
    classId: string | number,
    assignmentId: string,
    studentId: string,
    grade: string | number,
    feedback: string,
  ): Promise<void> {
    this.grade.set(String(grade));
    this.feedback.set(feedback);

    if (!isFirebaseEnabled()) return;
    const db = getFirestoreDb();
    if (!db) return;
    await updateDoc(
      doc(db, 'classes', String(classId), 'assignments', assignmentId, 'submissions', studentId),
      {
        grade: Number(grade),
        feedback,
        gradedAt: Date.now(),
        status: 'Noté',
      },
    );
  }
}
