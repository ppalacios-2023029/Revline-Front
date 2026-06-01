import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

/**
 * Configuración global de la aplicación Angular.
 * Define los proveedores disponibles en toda la app:
 * - provideRouter: habilita el sistema de rutas.
 * - provideHttpClient: habilita HttpClient para peticiones HTTP al backend.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
