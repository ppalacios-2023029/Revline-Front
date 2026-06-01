import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CascosService } from '../../core/services/cascos.service';
import { VentasService } from '../../core/services/ventas.service';
import { Casco } from '../../core/models';

/**
 * CatalogoPage — página de detalle de producto y punto de compra.
 *
 * Se activa cuando el usuario hace clic en "Ver detalle" desde la HomePage,
 * recibiendo el UUID del casco como parámetro de ruta (`/catalogo/:id`).
 *
 * Responsabilidades principales:
 *  - Cargar la información completa del casco (siempre desde la API para datos frescos).
 *  - Permitir al usuario seleccionar la talla deseada cuando el casco tiene variantes.
 *  - Controlar la cantidad de unidades a comprar.
 *  - Registrar la venta mediante VentasService, manejando estados de carga y error.
 *  - Proveer navegación de regreso hacia la página de inicio.
 */
@Component({
  selector: 'app-catalogo',
  imports: [],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class CatalogoPage implements OnInit {
  /** Ruta activa: permite leer el parámetro `:id` de la URL. */
  private route = inject(ActivatedRoute);

  /** Router de Angular para la navegación programática (botón "Volver"). */
  private router = inject(Router);

  /** Servicio que expone los endpoints de cascos de la API REST. */
  private service = inject(CascosService);

  /** Servicio que expone los endpoints de ventas de la API REST. */
  private ventasSvc = inject(VentasService);

  /**
   * Casco actualmente visualizado.
   * Se inicializa como null y se actualiza tras la llamada a la API.
   * La plantilla debe verificar que no sea null antes de renderizar datos del producto.
   */
  casco = signal<Casco | null>(null);

  /**
   * Talla seleccionada por el usuario.
   * Null cuando el casco tiene exactamente una talla (no requiere selección explícita)
   * o cuando el usuario aún no ha elegido ninguna.
   */
  tallaSel = signal<string | null>(null);

  /**
   * Cantidad de unidades que el usuario desea comprar.
   * Valor mínimo: 1 (controlado por los botones disminuir/aumentar).
   */
  cantidad = signal(1);

  /**
   * Indicador de operación de compra en curso.
   * true mientras la petición HTTP POST a /ventas está pendiente.
   * Se usa para deshabilitar el botón "Comprar" y mostrar un spinner.
   */
  comprando = signal(false);

  /**
   * Indicador de compra exitosa.
   * Se activa brevemente (4 segundos) tras una respuesta exitosa del servidor
   * para mostrar un mensaje de confirmación al usuario.
   */
  comprado = signal(false);

  /**
   * Mensaje de error relacionado con el proceso de compra.
   * Vacío cuando no hay error. Se muestra en la plantilla debajo del formulario.
   * Se limpia al seleccionar una talla o al iniciar una nueva compra.
   */
  errorCompra = signal('');

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Lee el parámetro `:id` de la URL y consulta el catálogo completo para encontrar
   * el casco correspondiente. Se hace un fetch fresco (no se usa el estado de navegación)
   * para garantizar que los datos de stock y variantes estén actualizados.
   */
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    // Siempre fetch fresco para garantizar que 'variantes' esté actualizado
    this.service.getCatalog().subscribe(list => {
      const found = list.find(c => c.id_casco === id) ?? null;
      this.casco.set(found);
      // Si el casco solo tiene una talla disponible, la preselecciona automáticamente
      if (found) this.autoSelTalla(found);
    });
  }

  /**
   * Pre-selecciona la talla si el casco solo tiene una opción disponible.
   * Esto evita que el usuario tenga que hacer clic en una única talla antes de comprar.
   * @param c - El casco cuyas tallas se evaluarán.
   */
  private autoSelTalla(c: Casco) {
    if (c.tallas?.length === 1) this.tallaSel.set(c.tallas[0]);
  }

  /**
   * Alterna la selección de una talla.
   * Si el usuario hace clic en la talla que ya está seleccionada, la deselecciona (null).
   * Si hace clic en una talla diferente, la selecciona y limpia cualquier error previo.
   * @param t - Código de la talla (p. ej. "M", "L", "XL").
   */
  selTalla(t: string) {
    this.tallaSel.set(this.tallaSel() === t ? null : t);
    this.errorCompra.set('');
  }

  /**
   * Decrementa la cantidad en 1, con un mínimo de 1 unidad.
   * No se permite llegar a 0 ni a valores negativos.
   */
  disminuir() {
    if (this.cantidad() > 1) this.cantidad.update(n => n - 1);
  }

  /**
   * Incrementa la cantidad en 1.
   * No hay límite superior impuesto en el frontend (el backend valida contra el stock).
   */
  aumentar() {
    this.cantidad.update(n => n + 1);
  }

  /**
   * Registra la venta del casco seleccionado con la talla y cantidad indicadas.
   *
   * Flujo de la operación:
   * 1. Valida que exista un casco cargado; aborta si no.
   * 2. Si el casco tiene múltiples tallas y ninguna está seleccionada, muestra error.
   * 3. Resuelve el `id_casco` correcto buscando la variante que coincida con la talla
   *    seleccionada (cada talla puede ser un registro independiente en el backend).
   * 4. Envía el DTO de venta a la API; durante la espera activa la bandera `comprando`.
   * 5. En caso de éxito: desactiva `comprando`, activa `comprado` 4 s y luego lo apaga.
   * 6. En caso de error: desactiva `comprando` y muestra el mensaje recibido del servidor.
   */
  comprar() {
    const c = this.casco();
    if (!c) return;

    // Validar que se haya elegido talla cuando hay más de una opción
    if ((c.tallas?.length ?? 0) > 1 && !this.tallaSel()) {
      this.errorCompra.set('Selecciona una talla antes de comprar');
      return;
    }

    // Resolver el id_casco correcto según la talla seleccionada
    const talla = this.tallaSel() ?? c.tallas?.[0];
    let idCasco = c.id_casco; // Valor por defecto: el id del casco "padre"

    if (talla && c.variantes?.length) {
      // Buscar la variante cuya talla coincida (trim para ignorar espacios extra)
      const variante = c.variantes.find(v => v.talla.trim() === talla.trim());
      if (variante) idCasco = variante.id_casco; // Usar el id de la variante específica
    }

    this.comprando.set(true);
    this.errorCompra.set('');

    this.ventasSvc.create({
      id_casco: idCasco,
      cantidad: this.cantidad(),
      estado: 'pendiente', // Toda venta nueva inicia con estado "pendiente"
    }).subscribe({
      next: () => {
        this.comprando.set(false);
        this.comprado.set(true);
        // Oculta el mensaje de confirmación después de 4 segundos
        setTimeout(() => this.comprado.set(false), 4000);
      },
      error: (err) => {
        this.comprando.set(false);
        // Muestra el mensaje de error del servidor o uno genérico si no hay mensaje
        this.errorCompra.set(err?.error?.message ?? 'No se pudo registrar la venta');
      },
    });
  }

  /**
   * Regresa a la página de inicio (vitrina de productos).
   */
  volver() {
    this.router.navigate(['/home']);
  }

  /**
   * Maneja el error de carga de una imagen (`<img> onerror`).
   * Oculta el elemento para no mostrar el ícono de imagen rota al usuario.
   * @param e - Evento de error del elemento <img>.
   */
  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }
}
