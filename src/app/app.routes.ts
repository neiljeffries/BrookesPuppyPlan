import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then(m => m.Home) },
  { path: 'login-required', loadComponent: () => import('./login-required/login-required').then(m => m.LoginRequired) },
  { path: 'about', loadComponent: () => import('./about/about').then(m => m.About), canActivate: [authGuard] },
  { path: 'training', loadComponent: () => import('./training/training').then(m => m.Training), canActivate: [authGuard] },
  { path: 'notes', loadComponent: () => import('./notes/notes').then(m => m.Notes), canActivate: [authGuard] },
  { path: 'contact', loadComponent: () => import('./contact/contact').then(m => m.Contact), canActivate: [authGuard] },
  { path: 'livestream', loadComponent: () => import('./livestream/livestream').then(m => m.Livestream), canActivate: [authGuard] },
  { path: 'test', loadComponent: () => import('./test/test').then(m => m.Test), canActivate: [authGuard] },
];
