import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz de la aplicación.
 * Únicamente renderiza el router-outlet, que es el espacio donde Angular
 * carga los componentes de cada ruta (MainLayout y sus hijos).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
