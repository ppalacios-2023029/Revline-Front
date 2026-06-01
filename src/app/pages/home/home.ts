import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CascosService } from '../../core/services/cascos.service';
import { Casco } from '../../core/models';

/**
 * HomePage — página principal / vitrina de productos.
 *
 * Muestra las tarjetas de todos los cascos disponibles en el catálogo público.
 * Cada tarjeta puede contener múltiples imágenes que se rotan automáticamente
 * en un carrusel por intervalo de tiempo (autoplay). El usuario también puede
 * navegar manualmente entre imágenes y hacer clic en "Ver detalle" para ir a
 * la página de detalle/compra del casco seleccionado.
 *
 * Implementa OnDestroy para limpiar el intervalo de autoplay cuando el usuario
 * abandona la página y evitar fugas de memoria (memory leaks).
 */
@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage implements OnInit, OnDestroy {
  /** Servicio para obtener el catálogo de cascos desde la API. */
  private service = inject(CascosService);

  /** Router de Angular para la navegación programática hacia el detalle de un casco. */
  private router = inject(Router);

  /**
   * Lista reactiva de cascos cargados desde el backend.
   * La plantilla se actualiza automáticamente cada vez que este signal cambia.
   */
  cascos = signal<Casco[]>([]);

  /**
   * Mapa reactivo privado que registra el índice de imagen actualmente visible
   * para cada casco. La clave es el `id_casco` (UUID) y el valor es el índice
   * del arreglo `files` del casco.
   * Es privado porque solo debe modificarse desde la lógica interna del componente.
   */
  private indices = signal<Record<string, number>>({});

  /**
   * Referencia al intervalo de autoplay creado con `setInterval`.
   * Se guarda para poder cancelarlo en `ngOnDestroy` y prevenir fugas de memoria.
   * Valor null indica que el intervalo aún no ha sido iniciado o ya fue cancelado.
   */
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Solicita la lista de cascos al servicio y, al recibirla, la almacena en el
   * signal `cascos` e inicia el autoplay del carrusel.
   */
  ngOnInit() {
    this.service.getCatalog().subscribe(data => {
      this.cascos.set(data);
      this.startAutoplay();
    });
  }

  /**
   * Ciclo de vida: se ejecuta al destruir el componente (p. ej. al navegar a otra ruta).
   * Cancela el intervalo de autoplay para evitar que siga ejecutándose en segundo plano.
   */
  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Inicia el carrusel automático de imágenes.
   * Cada 6 segundos recorre todos los cascos que tienen más de una imagen
   * e incrementa su índice actual de forma circular (vuelve a 0 al llegar al final).
   * Solo afecta a cascos con múltiples imágenes; los de una sola imagen se ignoran.
   */
  private startAutoplay() {
    this.timer = setInterval(() => {
      this.indices.update(curr => {
        // Crea una copia del mapa actual para no mutar el signal directamente
        const next = { ...curr };
        for (const c of this.cascos()) {
          const len = c.files?.length ?? 0;
          // Solo avanzar si hay más de una imagen disponible
          if (len > 1) {
            // Operador módulo para que el índice sea circular (0 → 1 → ... → len-1 → 0)
            next[c.id_casco] = ((curr[c.id_casco] ?? 0) + 1) % len;
          }
        }
        return next;
      });
    }, 6000); // Intervalo de 6 000 ms (6 segundos) entre cada cambio de imagen
  }

  /**
   * Devuelve el índice de la imagen actualmente visible para un casco dado.
   * @param id - UUID del casco consultado.
   * @returns Índice dentro del arreglo `files` del casco; 0 si aún no se registró.
   */
  idx(id: string): number {
    return this.indices()[id] ?? 0;
  }

  /**
   * Navega manualmente a una imagen específica de un casco.
   * Detiene la propagación del evento para evitar que el clic active el detalle
   * del producto mientras el usuario solo quiere cambiar de imagen.
   * @param id - UUID del casco cuyas imágenes se están paginando.
   * @param i  - Índice de la imagen destino dentro de `files`.
   * @param e  - Evento del DOM (clic sobre un indicador/dot del carrusel).
   */
  goTo(id: string, i: number, e: Event) {
    e.stopPropagation();
    // Actualiza solo la entrada correspondiente al casco, conservando el resto del mapa
    this.indices.update(m => ({ ...m, [id]: i }));
  }

  /**
   * Maneja el error de carga de una imagen (`<img> onerror`).
   * Oculta el elemento de imagen roto para no mostrar el ícono de imagen faltante.
   * @param e - Evento de error emitido por el elemento <img>.
   */
  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  /**
   * Navega a la página de detalle/compra de un casco concreto.
   * Detiene la propagación para evitar conflictos con otros listeners del contenedor.
   * Pasa el objeto `casco` completo en el estado de navegación para que la página
   * de detalle pueda pre-renderizar sin esperar la respuesta de la API.
   * @param c - El objeto Casco que se desea visualizar en detalle.
   * @param e - Evento del DOM (clic sobre el botón "Ver detalle").
   */
  verDetalle(c: Casco, e: Event) {
    e.stopPropagation();
    this.router.navigate(['/catalogo', c.id_casco], { state: { casco: c } });
  }
}
