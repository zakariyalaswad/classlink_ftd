export type RoleClasse = 'ENSEIGNANT' | 'ETUDIANT';
export type TypePublication = 'ANNONCE' | 'COURS' | 'DEVOIR';
export type PermissionPublication = 'ENSEIGNANTS' | 'TOUS_LES_MEMBRES';
export type PermissionCommentaire = 'ENSEIGNANTS' | 'TOUS_LES_MEMBRES';
export type TypeNotification =
  | 'NOUVELLE_ANNONCE'
  | 'NOUVEAU_COURS'
  | 'NOUVEAU_DEVOIR'
  | 'RAPPEL_ECHEANCE'
  | 'NOUVEAU_COMMENTAIRE'
  | 'NOUVELLE_REMISE'
  | 'NOTE_PUBLIEE'
  | string;

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photoUrl?: string | null;
}

export interface ParametresClasse {
  publicationAnnonces: PermissionPublication;
  commentaires: PermissionCommentaire;
  codeAccesActif: boolean;
}

export interface Classe {
  id: string;
  nom: string;
  description: string;
  matiere: string;
  codeAcces: string;
  archivee: boolean;
  dateCreation: string;
  parametres: ParametresClasse;
}

export interface Inscription {
  id: string;
  utilisateurId: string;
  classeId: string;
  role: RoleClasse;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  emailUtilisateur: string;
  photoUrlUtilisateur?: string | null;
}

export interface Publication {
  id: string;
  classeId: string;
  auteurId: string;
  nomAuteur: string;
  photoUrlAuteur?: string | null;
  type: TypePublication;
  titre: string;
  contenu: string;
  datePublication: string;
  dateLimite?: string | null;
  bareme?: number | null;
}

export interface Commentaire {
  id: string;
  publicationId: string;
  auteurId: string;
  nomAuteur: string;
  photoUrlAuteur?: string | null;
  contenu: string;
  dateCreation: string;
}

export interface Remise {
  id: string;
  devoirId: string;
  etudiantId: string;
  nomEtudiant: string;
  texte: string;
  dateRemise: string;
  note?: number | null;
  correction?: string | null;
}

export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface AppNotification {
  id: string;
  utilisateurId?: string;
  classeId: string;
  nomClasse: string;
  type: TypeNotification;
  titre: string;
  message: string;
  lienCible?: string | null;
  dateCreation: string;
  dateLecture?: string | null;
  emailStatus?: EmailStatus | null;
  destinataireEmail?: string | null;
  emailAttempts?: number | null;
  emailSentAt?: string | null;
  emailError?: string | null;
}

export interface PreferenceNotification {
  id: string;
  type: TypeNotification;
  dansApplication: boolean;
  parEmail: boolean;
}