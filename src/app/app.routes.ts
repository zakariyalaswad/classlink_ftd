import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent) },
      { path: 'classes', loadComponent: () => import('./pages/classes.component').then((m) => m.ClassesComponent) },
      { path: 'classes/:id', loadComponent: () => import('./pages/class-detail.component').then((m) => m.ClassDetailComponent) },
      { path: 'calendar', loadComponent: () => import('./pages/calendar.component').then((m) => m.CalendarComponent) },
      { path: 'archived', loadComponent: () => import('./pages/archived-classes.component').then((m) => m.ArchivedClassesComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications.component').then((m) => m.NotificationsComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
