import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AppNotification } from '../core/models';
import { StoreService } from '../core/store.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, IconComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-extrabold text-[#182033]">Notifications</h1>
        <p class="text-xs text-slate-500 mt-0.5">
          {{ store.unreadCount() }} notification(s) non lue(s)
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-light !text-xs"
          (click)="refresh()"
          [disabled]="refreshing() || markingAll()"
        >
          @if (refreshing()) {
            <app-icon name="spinner" [size]="13" />
          }
          <span>{{ refreshing() ? 'Actualisation...' : 'Actualiser' }}</span>
        </button>
        <button
          type="button"
          class="btn-light !text-xs"
          (click)="readAll()"
          [disabled]="markingAll() || refreshing() || !store.unreadCount()"
        >
          @if (markingAll()) {
            <app-icon name="spinner" [size]="13" />
          }
          <span>{{ markingAll() ? 'Traitement...' : 'Tout marquer comme lu' }}</span>
        </button>
      </div>
    </div>

    @if (error()) {
      <p class="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-xs text-red-600">
        {{ error() }}
      </p>
    }

    <div class="space-y-2">
      @for (n of store.notifications(); track n.id) {
        <button
          type="button"
          class="card w-full text-left transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          [class.border-blue-300]="!n.dateLecture"
          [class.bg-[#f6f9ff]]="!n.dateLecture"
          [disabled]="openingId() !== null"
          (click)="open(n)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-sm text-[#182033]">{{ n.titre }}</p>
              <p class="text-sm text-slate-600 mt-0.5">{{ n.message }}</p>
              <p class="text-xs text-slate-400 mt-1">
                @if (n.nomClasse) {
                  <span class="font-semibold text-[#2454d6]">{{ n.nomClasse }}</span> ·
                }
                {{ n.dateCreation | date: 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            @if (openingId() === n.id) {
              <span class="text-[#2454d6] shrink-0 mt-1">
                <app-icon name="spinner" [size]="15" />
              </span>
            } @else if (!n.dateLecture) {
              <span class="w-2.5 h-2.5 rounded-full bg-[#2454d6] shrink-0 mt-1.5" aria-label="Non lue"></span>
            }
          </div>
        </button>
      } @empty {
        <p class="text-sm text-slate-500">Aucune notification.</p>
      }
    </div>
  `,
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly store = inject(StoreService);
  readonly error = signal('');
  readonly refreshing = signal(false);
  readonly markingAll = signal(false);
  readonly openingId = signal<string | null>(null);

  async open(n: AppNotification): Promise<void> {
    if (this.openingId()) return;
    this.error.set('');
    this.openingId.set(n.id);
    try {
      if (!n.dateLecture) {
        try {
          await this.api.markRead(n.id);
          await this.store.refreshNotifications();
        } catch (e) {
          this.error.set((e as Error).message);
        }
      }
      if (n.lienCible) {
        await this.router.navigateByUrl(n.lienCible);
      } else if (n.classeId) {
        await this.router.navigate(['/classes', n.classeId]);
      }
    } finally {
      this.openingId.set(null);
    }
  }

  async readAll(): Promise<void> {
    if (this.markingAll()) return;
    this.error.set('');
    this.markingAll.set(true);
    try {
      await this.api.markAllRead();
      await this.store.refreshNotifications();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.markingAll.set(false);
    }
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.error.set('');
    this.refreshing.set(true);
    try {
      await this.store.refreshNotifications();
    } finally {
      this.refreshing.set(false);
    }
  }
}
