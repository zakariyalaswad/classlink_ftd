import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassLinkStateService } from '../../core/services/classlink-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClassroomService } from '../../core/services/classroom.service';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { DashboardComponent } from './dashboard.component';
import { ClassroomComponent } from './classroom.component';
import { AssignmentComponent } from './assignment.component';
import { AccountSettingsComponent } from './account-settings.component';
import { NotificationsPageComponent } from './notifications-page.component';
import { ClassSettingsComponent } from './class-settings.component';
import { NotificationPanelComponent } from './notification-panel.component';

@Component({
  selector: 'app-classlink-shell',
  standalone: true,
  imports: [
    FormsModule,
    IconComponent,
    AvatarComponent,
    DashboardComponent,
    ClassroomComponent,
    AssignmentComponent,
    AccountSettingsComponent,
    NotificationsPageComponent,
    ClassSettingsComponent,
    NotificationPanelComponent,
  ],
  templateUrl: './classlink-shell.component.html',
})
export class ClassLinkShellComponent {
  readonly state = inject(ClassLinkStateService);
  private readonly notifications = inject(NotificationService);
  private readonly classrooms = inject(ClassroomService);

  crumbLabel(): string {
    switch (this.state.view()) {
      case 'dashboard':
        return 'Mes classes';
      case 'account':
        return 'Paramètres du compte';
      case 'notifications':
        return 'Notifications';
      case 'classSettings':
        return 'Paramètres de la classe';
      case 'class':
        return this.state.settings().name;
      default:
        return 'Créer une API REST';
    }
  }

  markAllNotices(): void {
    this.notifications.markAllRead();
    this.state.persistNotices();
  }

  submitCreate(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const inputs = form.querySelectorAll('input, textarea');
    const name = (inputs[0] as HTMLInputElement)?.value?.trim() || 'Nouvelle classe';
    const subject = (inputs[1] as HTMLInputElement)?.value?.trim() || 'Matière';
    const description = (inputs[2] as HTMLTextAreaElement)?.value?.trim() || '';
    void this.classrooms.createClass({ name, subject, description });
    this.state.modal.set(null);
    this.state.notify('Classe créée avec succès');
  }

  submitWork(event: Event): void {
    event.preventDefault();
    this.state.modal.set(null);
    this.state.notify('Le contenu a été publié');
  }

  confirmSubmit(): void {
    this.state.submitted.set(true);
    this.state.modal.set(null);
    this.state.notify('Devoir remis avec succès');
  }
}
