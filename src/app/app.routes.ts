import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';
import { roleGuard } from './role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then(m => m.Home) },
  { path: 'register', loadComponent: () => import('./register/register').then(m => m.Register) },
  { path: 'login-required', loadComponent: () => import('./login-required/login-required').then(m => m.LoginRequired) },
  { path: 'logged-out', loadComponent: () => import('./logged-out/logged-out').then(m => m.LoggedOut) },
  { path: 'about', loadComponent: () => import('./about/about').then(m => m.About) },
  { path: 'training', loadComponent: () => import('./training/training').then(m => m.Training), canActivate: [authGuard] },
  { path: 'notes', loadComponent: () => import('./notes/notes').then(m => m.Notes), canActivate: [adminGuard] },
  { path: 'chat', loadComponent: () => import('./chat/chat').then(m => m.Chat), canActivate: [roleGuard] },
  { path: 'contact', loadComponent: () => import('./contact/contact').then(m => m.Contact) },
  { path: 'reminders', loadComponent: () => import('./reminders/reminders').then(m => m.Reminders), canActivate: [roleGuard] },
  { path: 'livestream', loadComponent: () => import('./livestream/livestream').then(m => m.Livestream), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./admin/admin').then(m => m.Admin), canActivate: [adminGuard] },
];
