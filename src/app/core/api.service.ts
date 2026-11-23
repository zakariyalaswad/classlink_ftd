import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AppNotification, Classe, Commentaire, Inscription, ParametresClasse, PreferenceNotification,
  Publication, Remise, TypeNotification, TypePublication, Utilisateur,
} from './models';

/** Thin typed client of the Spring Boot REST API. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private async call<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) throw new Error('Serveur injoignable. Vérifiez que le back-end est démarré.');
        throw new Error(e.error?.error ?? `Erreur ${e.status}`);
      }
      throw e;
    }
  }
  /** GETs are retried once (first call after login can race the token / cold server). */
  private async get<T>(path: string): Promise<T> {
    try {
      return await this.call(firstValueFrom(this.http.get<T>(this.base + path)));
    } catch (e) {
      await new Promise((r) => setTimeout(r, 600));
      return this.call(firstValueFrom(this.http.get<T>(this.base + path)));
    }
  }
  private post<T>(path: string, body: unknown = {}) { return this.call(firstValueFrom(this.http.post<T>(this.base + path, body))); }
  private put<T>(path: string, body: unknown = {}) { return this.call(firstValueFrom(this.http.put<T>(this.base + path, body))); }

  // --- profile
  register(nom: string, prenom: string) { return this.post<Utilisateur>('/auth/register', { nom, prenom }); }
  me() { return this.get<Utilisateur>('/auth/me'); }
  updateProfile(nom: string, prenom: string, photoUrl?: string | null) {
    return this.put<Utilisateur>('/users/profile', { nom, prenom, photoUrl });
  }
  getPreferences() { return this.get<PreferenceNotification[]>('/users/preferences'); }
  updatePreference(type: TypeNotification, dansApplication: boolean, parEmail: boolean) {
    return this.put<PreferenceNotification>('/users/preferences', { type, dansApplication, parEmail });
  }

  // --- classes
  getClasses() { return this.get<Classe[]>('/classes'); }
  getClass(id: string) { return this.get<Classe>(`/classes/${id}`); }
  createClass(nom: string, matiere: string, description: string) { return this.post<Classe>('/classes', { nom, matiere, description }); }
  joinClass(codeAcces: string) { return this.post<Inscription>('/classes/join', { codeAcces }); }
  getMembers(id: string) { return this.get<Inscription[]>(`/classes/${id}/members`); }
  updateSettings(id: string, s: Partial<ParametresClasse>) { return this.put<Classe>(`/classes/${id}/settings`, s); }
  regenerateCode(id: string) { return this.post<{ codeAcces: string }>(`/classes/${id}/regenerate-code`); }
  archive(id: string, archivee: boolean) { return this.put<Classe>(`/classes/${id}/archive?archivee=${archivee}`); }
  canAnnounce(classId: string) { return this.get<{ allowed: boolean }>(`/classes/${classId}/check-announcement-permission`); }

  // --- publications
  getPublications(classId: string) { return this.get<Publication[]>(`/classes/${classId}/publications`); }
  createPublication(classId: string, p: { type: TypePublication; titre: string; contenu: string; dateLimite?: string | null; bareme?: number | null }) {
    return this.post<Publication>(`/classes/${classId}/publications`, p);
  }
  canComment(pubId: string) { return this.get<{ allowed: boolean }>(`/publications/${pubId}/check-comment-permission`); }
  getComments(pubId: string) { return this.get<Commentaire[]>(`/publications/${pubId}/comments`); }
  addComment(pubId: string, contenu: string) { return this.post<Commentaire>(`/publications/${pubId}/comments`, { contenu }); }

  // --- assignments
  getSubmissions(devoirId: string) { return this.get<Remise[]>(`/assignments/${devoirId}/submissions`); }
  async getMySubmission(devoirId: string) { return (await this.get<Remise | null>(`/assignments/${devoirId}/my-submission`)) || null; }
  submit(devoirId: string, texte: string) { return this.post<Remise>(`/assignments/${devoirId}/submissions`, { texte }); }
  grade(remiseId: string, note: number, correction: string) { return this.put<Remise>(`/submissions/${remiseId}/grade`, { note, correction }); }

  // --- notifications
  getNotifications() { return this.get<AppNotification[]>('/notifications'); }
  markRead(id: string) { return this.put<unknown>(`/notifications/${id}/read`); }
  markAllRead() { return this.post<unknown>('/notifications/mark-all-read'); }
}