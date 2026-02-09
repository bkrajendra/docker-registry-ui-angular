import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/catalog/catalog.component').then((m) => m.CatalogComponent) },
  {
    path: 'taglist/:image',
    loadComponent: () => import('./features/tag-list/tag-list.component').then((m) => m.TagListComponent),
  },
  {
    path: 'taghistory/:image/:tag',
    loadComponent: () => import('./features/tag-history/tag-history.component').then((m) => m.TagHistoryComponent),
  },
  { path: '**', redirectTo: '' },
];
