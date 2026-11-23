import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AppNotification } from '../core/models';
import { StoreService } from '../core/store.service';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe],
  template: `
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-extrabold">Notifications</h1>
      <button class="btn-light" (click)="readAll()" [disabled]="!store.unreadCount()">Tout marquer comme lu</button>
    </div>
    <div class="space-y-2">
      @for (n of store.notifications(); track n.id) {
        <button class="card w-full text-left" [class.border-blue-300]="!n.dateLecture" (click)="open(n)">
          <p class="font-semibold text-sm">{{ n.titre }}</p>
          <p class="text-sm text-slate-600">{{ n.message }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ n.nomClasse }} · {{ n.dateCreation | date: 'dd/MM HH:mm' }}</p>
        </button>
      } @empty { <p class="text-sm text-slate-500">Aucune notification.</p> }
    </div>
  `,
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly store = inject(StoreService);

  async open(n: AppNotification): Promise<void> {
    if (!n.dateLecture) { await this.api.markRead(n.id).catch(() => undefined); await this.store.refreshNotifications(); }
    if (n.classeId) await this.router.navigate(['/classes', n.classeId]);
  }
  async readAll(): Promise<void> {
    await this.api.markAllRead();
    await this.store.refreshNotifications();
  }
}