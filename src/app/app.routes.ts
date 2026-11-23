import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/landing.component').then((m) => m.LandingComponent),
  },
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
      { path: 'home', loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent) },
      { path: 'classes', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'classes/:id',
        loadComponent: () => import('./pages/class-detail.component').then((m) => m.ClassDetailComponent),
      },
      { path: 'calendar', loadComponent: () => import('./pages/calendar.component').then((m) => m.CalendarComponent) },
      {
        path: 'archived',
        loadComponent: () => import('./pages/archived-classes.component').then((m) => m.ArchivedClassesComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications.component').then((m) => m.NotificationsComponent),
      },
      { path: 'settings', loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
