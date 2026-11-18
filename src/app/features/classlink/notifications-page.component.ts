import { Component, inject, signal } from '@angular/core';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="page settingsPage">
      <div class="settingsTitle">
        <div>
          <p class="eyebrow">CENTRE PERSONNEL</p>
          <h1>Notifications</h1>
          <p>Suivez l’activité importante de vos classes.</p>
        </div>
        <button class="btn secondary" type="button" (click)="markAll()">Tout marquer comme lu</button>
      </div>

      <div class="noticeFilters large">
        <button type="button" [class.active]="!onlyUnread()" (click)="onlyUnread.set(false)">Toutes</button>
        <button type="button" [class.active]="onlyUnread()" (click)="onlyUnread.set(true)">Non lues</button>
      </div>

      <div class="fullNoticeList">
        @for (n of shown(); track n.id) {
          <button type="button" [class.unread]="!n.read" (click)="state.openNotice(n)">
            <span class="noticeIcon"><app-icon name="bell" /></span>
            <div>
              <b>{{ n.title }}</b>
              <span>{{ n.classroom }}</span>
              <p>{{ n.text }}</p>
            </div>
            <small>{{ n.time }}</small>
          </button>
        }
      </div>
    </div>
  `,
})
export class NotificationsPageComponent {
  readonly state = inject(ClassLinkStateService);
  private readonly notifications = inject(NotificationService);
  readonly onlyUnread = signal(false);

  shown() {
    const list = this.state.notices();
    return this.onlyUnread() ? list.filter((n) => !n.read) : list;
  }

  markAll(): void {
    this.notifications.markAllRead();
    this.state.persistNotices();
  }
}
