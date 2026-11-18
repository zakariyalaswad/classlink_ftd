export type Role = 'enseignant' | 'étudiant';
export type Modal = 'create' | 'join' | 'work' | 'confirm' | 'archive' | 'code' | null;
export type Tab = 'fil' | 'travaux' | 'membres' | 'notes';
export type View =
  | 'dashboard'
  | 'class'
  | 'assignment'
  | 'account'
  | 'notifications'
  | 'classSettings';

export interface ClassSettings {
  name: string;
  subject: string;
  description: string;
  code: string;
  codeEnabled: boolean;
  announcements: 'teachers' | 'all';
  comments: 'teachers' | 'all' | 'none';
  archived: boolean;
}

export interface Notice {
  id: number;
  title: string;
  classroom: string;
  text: string;
  time: string;
  read: boolean;
  target: 'class' | 'assignment';
}

export interface ClassItem {
  id: number | string;
  title: string;
  subject: string;
  teacher: string;
  members: number;
  due: string;
  color: string;
  code: string;
  role: Role;
}

export interface AssignmentItem {
  id?: string;
  title: string;
  type: 'Devoir' | 'Cours' | string;
  due: string;
  score: number;
  status: string;
}

export interface UserProfile {
  first: string;
  last: string;
  email: string;
  photo: string;
}

export interface NotificationPreference {
  app: boolean;
  email: boolean;
}

export interface CreateClassPayload {
  name: string;
  subject: string;
  description: string;
}

export interface CreateAssignmentPayload {
  title: string;
  type: string;
  instructions: string;
  dueDate?: string;
  maxScore?: number;
}
