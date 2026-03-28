import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then(m => m.Home) },
  { path: 'about', loadComponent: () => import('./about/about').then(m => m.About) },
  { path: 'training', loadComponent: () => import('./training/training').then(m => m.Training) },
  { path: 'notes', loadComponent: () => import('./notes/notes').then(m => m.Notes) },
  { path: 'contact', loadComponent: () => import('./contact/contact').then(m => m.Contact) },
  { path: 'livestream', loadComponent: () => import('./livestream/livestream').then(m => m.Livestream) },
  { path: 'test', loadComponent: () => import('./test/test').then(m => m.Test) },
];
