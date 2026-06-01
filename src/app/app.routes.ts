import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout';

/**
 * Tabla de rutas de la aplicación.
 * Todas las rutas están anidadas bajo MainLayout (header + sidebar).
 * Se usa lazy loading para cargar cada página solo cuando se necesita.
 */
export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home').then(m => m.HomePage),
      },
      {
        path: 'catalogo/:id',
        loadComponent: () => import('./pages/catalogo/catalogo').then(m => m.CatalogoPage),
      },
      {
        path: 'cascos',
        loadComponent: () => import('./pages/cascos/cascos').then(m => m.CascosPage),
      },
      {
        path: 'marcas',
        loadComponent: () => import('./pages/marcas/marcas').then(m => m.MarcasPage),
      },
      {
        path: 'medidas',
        loadComponent: () => import('./pages/medidas/medidas').then(m => m.MedidasPage),
      },
      {
        path: 'tipos',
        loadComponent: () => import('./pages/tipos/tipos').then(m => m.TiposPage),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('./pages/certificados/certificados').then(m => m.CertificadosPage),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./pages/inventario/inventario').then(m => m.InventarioPage),
      },
      {
        path: 'ventas',
        loadComponent: () => import('./pages/ventas/ventas').then(m => m.VentasPage),
      },
    ],
  },
];
