import {
  AssignmentItem,
  ClassItem,
  ClassSettings,
  Notice,
} from '../models/classlink.models';

export const defaultSettings: ClassSettings = {
  name: 'Développement Web',
  subject: 'Informatique',
  description: 'Concevoir des applications web modernes, accessibles et robustes.',
  code: 'CL-WEB24',
  codeEnabled: true,
  announcements: 'teachers',
  comments: 'all',
  archived: false,
};

export const initialNotices: Notice[] = [
  {
    id: 1,
    title: 'Nouveau devoir publié',
    classroom: 'Développement Web',
    text: 'Un nouveau devoir a été publié en Développement Web.',
    time: 'Il y a 12 min',
    read: false,
    target: 'assignment',
  },
  {
    id: 2,
    title: 'Votre devoir a été noté',
    classroom: 'Bases de données',
    text: 'Votre devoir SQL a été noté : 16/20.',
    time: 'Il y a 2 h',
    read: false,
    target: 'class',
  },
  {
    id: 3,
    title: 'Nouvelle remise',
    classroom: 'Développement Web',
    text: 'Une nouvelle remise est disponible pour correction.',
    time: 'Hier',
    read: false,
    target: 'assignment',
  },
  {
    id: 4,
    title: 'Échéance demain',
    classroom: 'Programmation Java',
    text: 'Le devoir Java est à rendre demain.',
    time: 'Hier',
    read: true,
    target: 'class',
  },
];

export const CLASSES: ClassItem[] = [
  {
    id: 1,
    title: 'Développement Web',
    subject: 'Informatique',
    teacher: 'Sophie Martin',
    members: 26,
    due: 'API REST · 18 juin',
    color: 'blue',
    code: 'CL-WEB24',
    role: 'enseignant',
  },
  {
    id: 2,
    title: 'Bases de données',
    subject: 'SQL & Modélisation',
    teacher: 'Thomas Bernard',
    members: 22,
    due: 'Jointures SQL · 20 juin',
    color: 'violet',
    code: 'CL-SQL25',
    role: 'étudiant',
  },
  {
    id: 3,
    title: 'Programmation Java',
    subject: 'Développement objet',
    teacher: 'Nadia Diallo',
    members: 31,
    due: 'Collections Java · 24 juin',
    color: 'orange',
    code: 'CL-JAVA8',
    role: 'étudiant',
  },
  {
    id: 4,
    title: 'Réseaux informatiques',
    subject: 'Infrastructure',
    teacher: 'Thomas Bernard',
    members: 19,
    due: 'Aucune échéance',
    color: 'green',
    code: 'CL-NET12',
    role: 'étudiant',
  },
];

export const STUDENTS = [
  'Lina Moreau',
  'Hugo Petit',
  'Emma Laurent',
  'Lucas Robert',
  'Inès Simon',
  'Louis Michel',
  'Chloé Garcia',
  'Nathan Leroy',
];

export const TEACHERS = ['Sophie Martin', 'Thomas Bernard', 'Nadia Diallo'];

export const ASSIGNMENTS: AssignmentItem[] = [
  {
    title: 'Créer une API REST avec Spring Boot',
    type: 'Devoir',
    due: '18 juin à 23:59',
    score: 20,
    status: 'À faire',
  },
  {
    title: 'Introduction aux composants Angular',
    type: 'Cours',
    due: 'Publié le 10 juin',
    score: 0,
    status: 'Nouveau',
  },
  {
    title: 'Exercices SQL — Jointures',
    type: 'Devoir',
    due: '20 juin à 18:00',
    score: 15,
    status: 'Remis',
  },
  {
    title: 'Architecture client-serveur',
    type: 'Cours',
    due: 'Publié le 7 juin',
    score: 0,
    status: 'Consulté',
  },
];

export const PREFERENCE_NAMES = [
  'Nouvelle annonce',
  'Nouveau cours',
  'Nouveau devoir',
  'Rappel d’échéance',
  'Nouveau commentaire',
  'Nouvelle remise',
  'Note publiée',
];

export const DEADLINES = [
  ['18', 'JUIN', 'Créer une API REST avec Spring Boot', 'Développement Web', 'Demain, 23:59', 'blue'],
  ['20', 'JUIN', 'Exercices SQL — Jointures', 'Bases de données', 'Dans 3 jours', 'violet'],
  ['24', 'JUIN', 'Collections et génériques', 'Programmation Java', 'Dans 7 jours', 'orange'],
] as const;

export const studentNoticesSeed = (): Notice[] =>
  initialNotices.filter((n) => n.title !== 'Nouvelle remise');
