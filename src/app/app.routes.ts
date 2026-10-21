import { type Routes } from '@angular/router';

import { environment } from '../environments/environment';
import { guestGuard, roleGuard } from './core/role.guard';

const placeholder = (title: string, stateTitle: string, message: string) => ({ title, stateTitle, message });

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/sign-in' },
  {
    path: 'auth/sign-in',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/sign-in.page').then((module) => module.SignInPage),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/register.page').then((module) => module.RegisterPage),
  },
  {
    path: 'auth/verify-email',
    loadComponent: () => import('./auth/verify-email.page').then((module) => module.VerifyEmailPage),
  },
  {
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/forgot-password.page').then((module) => module.ForgotPasswordPage),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./auth/reset-password.page').then((module) => module.ResetPasswordPage),
  },
  {
    path: 'role',
    loadComponent: () => import('./auth/role-chooser.page').then((module) => module.RoleChooserPage),
  },
  {
    path: 'driver',
    canActivate: [roleGuard('DRIVER')],
    loadComponent: () => import('./driver/driver-shell.component').then((module) => module.DriverShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./driver/driver-home.page').then((module) => module.DriverHomePage) },
      { path: 'map', data: placeholder('Route Map', 'Tracking contract required', 'Map shell implementation waits for Agent B client-safe latest-state and realtime contracts.'), loadComponent: () => import('./shared/placeholder-page.component').then((module) => module.PlaceholderPageComponent) },
      { path: 'group', data: placeholder('Group', 'Group scope not loaded', 'Same-group details require an approved server-scoped contract.'), loadComponent: () => import('./shared/placeholder-page.component').then((module) => module.PlaceholderPageComponent) },
      { path: 'events', data: placeholder('Events', 'Event contract required', 'Compliance history and events remain an Agent B integration gate.'), loadComponent: () => import('./shared/placeholder-page.component').then((module) => module.PlaceholderPageComponent) },
      { path: 'account', loadComponent: () => import('./shared/account.page').then((module) => module.AccountPage) },
    ],
  },
  {
    path: 'operator',
    canActivate: [roleGuard('OPERATOR')],
    loadComponent: () => import('./operator/operator-shell.component').then((module) => module.OperatorShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./operator/operator-dashboard.page').then((module) => module.OperatorDashboardPage) },
      { path: 'fleet', data: placeholder('Fleet', 'Fleet integration pending', 'Vehicle, driver and group lists will use accepted Agent A contracts only.'), loadComponent: () => import('./shared/placeholder-page.component').then((module) => module.PlaceholderPageComponent) },
      { path: 'transits', data: placeholder('Transits', 'Transit integration pending', 'Approved routes and effective assignments will come from Agent A.'), loadComponent: () => import('./shared/placeholder-page.component').then((module) => module.PlaceholderPageComponent) },
      { path: 'requests', data: placeholder('Requests', 'Workflow integration pending', 'Vehicle and GPS requests will use accepted Agent A workflow states.'), loadComponent: () => import('./shared/placeholder-page.component').then((module) => module.PlaceholderPageComponent) },
      { path: 'account', loadComponent: () => import('./shared/account.page').then((module) => module.AccountPage) },
    ],
  },
  ...(environment.enableFoundationPreview
    ? [
        {
          path: 'foundation/:view',
          loadComponent: () => import('./foundation-preview.page').then((module) => module.FoundationPreviewPage),
        },
      ]
    : []),
  { path: '**', redirectTo: 'auth/sign-in' },
];
