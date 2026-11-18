import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Notice } from '../../core/models/classlink.models';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  template: `
    <div class="noticePanel">
      <div class="noticeHead">
        <h3>Notifications</h3>
        <button type="button" (click)="markAll.emit()">Tout marquer comme lu</button>
      </div>
      <div class="noticeFilters">
        <button type="button" [class.active]="!onlyUnread()" (click)="onlyUnread.set(false)">Toutes</button>
        <button type="button" [class.active]="onlyUnread()" (click)="onlyUnread.set(true)">Non lues</button>
      </div>
      <div class="noticeList">
        @if (shown().length) {
          @for (n of shown().slice(0, 4); track n.id) {
            <button type="button" [class.unread]="!n.read" (click)="openNotice.emit(n)">
              <i></i>
              <div>
                <b>{{ n.title }}</b>
                <span>{{ n.classroom }}</span>
                <p>{{ n.text }}</p>
                <small>{{ n.time }}</small>
              </div>
            </button>
          }
        } @else {
          <p class="noticeEmpty">Aucune notification non lue.</p>
        }
      </div>
      <button class="allNotices" type="button" (click)="goAll.emit()">Voir toutes les notifications</button>
    </div>
  `,
})
export class NotificationPanelComponent {
  @Input({ required: true }) notices: Notice[] = [];
  @Output() openNotice = new EventEmitter<Notice>();
  @Output() markAll = new EventEmitter<void>();
  @Output() goAll = new EventEmitter<void>();

  readonly onlyUnread = signal(false);

  shown(): Notice[] {
    return this.onlyUnread() ? this.notices.filter((n) => !n.read) : this.notices;
  }
}
