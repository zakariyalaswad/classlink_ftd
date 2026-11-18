/**
 * EXAMPLE ONLY — not imported by the app.
 *
 * 1. Create a Firebase project
 * 2. Enable Auth (Email/Password), Firestore, Storage
 * 3. Paste web config into `src/environments/environment*.ts`
 * 4. Set `useFirebase: true`
 * 5. Copy these calls into a component / effect when you want live data
 *
 * Suggested collections:
 *   users/{uid}
 *   classes/{classId}
 *   classes/{classId}/assignments/{assignmentId}
 *   classes/{classId}/assignments/{assignmentId}/submissions/{studentId}
 *   classMembers/{classId}/users/{uid}
 *   notifications/{uid}/items/{noticeId}
 */

import { AuthService } from '../core/services/auth.service';
import { ClassroomService } from '../core/services/classroom.service';
import { AssignmentService } from '../core/services/assignment.service';
import { NotificationService } from '../core/services/notification.service';

export async function runFirebaseSmokeTest(
  auth: AuthService,
  classrooms: ClassroomService,
  assignments: AssignmentService,
  notifications: NotificationService,
): Promise<void> {
  // Auth
  await auth.signUp('camille@exemple.fr', 'MotDePasse123', 'Camille Dupont');
  await auth.signIn('camille@exemple.fr', 'MotDePasse123');
  await auth.saveProfile({
    first: 'Camille',
    last: 'Dupont',
    email: 'camille@exemple.fr',
    photo: '',
  });

  // Classes
  const created = await classrooms.createClass({
    name: 'Développement Web',
    subject: 'Informatique',
    description: 'API REST, Angular, Firebase',
  });
  await classrooms.joinClass('CL-WEB24');
  classrooms.saveClassSettings(
    {
      name: 'Développement Web',
      subject: 'Informatique',
      description: 'Concevoir des applications web modernes.',
      code: 'CL-WEB24',
      codeEnabled: true,
      announcements: 'teachers',
      comments: 'all',
      archived: false,
    },
    created.id,
  );
  classrooms.regenerateCode(created.id);

  // Assignments + submissions + grades
  const work = await assignments.createAssignment(String(created.id), {
    title: 'Créer une API REST avec Spring Boot',
    type: 'Devoir',
    instructions: 'CRUD livres / auteurs',
    dueDate: '2025-06-18',
    maxScore: 20,
  });
  await assignments.submitWork(String(created.id), work.id!, 'student-1', 'Voici mon projet', null);
  await assignments.saveGrade(String(created.id), work.id!, 'student-1', 16, 'Très bon travail');

  // Notifications
  notifications.pushGradeNotice('Développement Web', 16, false);
  await notifications.pushRemoteNotice('student-1', {
    id: Date.now(),
    title: 'Note publiée',
    classroom: 'Développement Web',
    text: 'Votre devoir a été noté : 16/20.',
    time: 'À l’instant',
    read: false,
    target: 'assignment',
  });
  await notifications.syncFromFirebase('student-1');
  await notifications.markAllReadRemote('student-1');

  await auth.signOut();
}
