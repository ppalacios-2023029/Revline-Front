import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * MainLayout — componente raíz de la estructura visual de la aplicación.
 *
 * Actúa como shell principal: contiene la barra de navegación lateral (sidebar)
 * y el área de contenido dinámico mediante <router-outlet>. Todos los módulos
 * de negocio se renderizan dentro de este layout gracias a la configuración de
 * rutas hijas definida en el enrutador de la aplicación.
 *
 * Responsabilidades:
 *  - Controlar la visibilidad del sidebar en dispositivos móviles/tablet.
 *  - Proveer enlaces de navegación (RouterLink) hacia cada sección del sistema.
 *  - Marcar visualmente el enlace activo (RouterLinkActive).
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  /**
   * Estado reactivo que indica si el sidebar está abierto (true) o cerrado (false).
   * Se usa como Signal de Angular 17+ para evitar la necesidad de ChangeDetectionStrategy
   * manual: la plantilla se actualiza automáticamente cuando el valor cambia.
   * Valor inicial: false (sidebar oculto al cargar la aplicación).
   */
  sidebarOpen = signal(false);

  /**
   * Alterna el estado del sidebar entre abierto y cerrado.
   * Utiliza `update` para derivar el nuevo valor a partir del actual,
   * garantizando que la mutación sea atómica respecto al ciclo de detección.
   */
  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  /**
   * Cierra el sidebar de forma explícita.
   * Se llama, por ejemplo, cuando el usuario hace clic en un enlace de navegación
   * en modo móvil, para que el menú desaparezca tras seleccionar una opción.
   */
  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
