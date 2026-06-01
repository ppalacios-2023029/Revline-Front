import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VentasService } from '../../core/services/ventas.service';
import { CascosService } from '../../core/services/cascos.service';
import { Venta, Casco, EstadoVenta } from '../../core/models';

/**
 * VentasPage — módulo de administración de transacciones de venta (CRUD completo).
 *
 * Gestiona el registro de ventas de cascos. Cada venta referencia un casco,
 * incluye una cantidad y tiene un estado que puede cambiar a lo largo del tiempo.
 * Al registrar una venta con estado "pendiente" o "completada", el backend
 * decrementa automáticamente el stock del inventario correspondiente.
 *
 * Estructura de una venta:
 *  - id_casco:      UUID del casco vendido (FK, requerido).
 *  - cantidad:      Unidades vendidas (requerido, mínimo 1).
 *  - estado:        Estado del pedido: 'pendiente' | 'completada' | 'cancelada'.
 *  - fecha_entrega: Fecha opcional en que se entregará el pedido (ISO 8601).
 *
 * Funcionalidades adicionales:
 *  - `badgeClass()`:  Devuelve la clase CSS del badge de estado para el coloreado visual.
 *  - `formatDate()`:  Formatea fechas ISO en formato legible local (es-GT).
 *  - `estadoLabels`:  Mapa de etiquetas legibles en español para los estados del select.
 *
 * Al inicializar se cargan tanto las ventas existentes como la lista de cascos
 * para el selector del formulario.
 */
@Component({
  selector: 'app-ventas',
  imports: [ReactiveFormsModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class VentasPage implements OnInit {
  /** Servicio CRUD para el recurso /ventas de la API REST. */
  private service = inject(VentasService);

  /** Servicio de cascos utilizado para poblar el selector del formulario. */
  private cascosSvc = inject(CascosService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de ventas obtenida del backend.
   * Se actualiza tras cada operación CRUD exitosa.
   */
  items = signal<Venta[]>([]);

  /**
   * Lista reactiva de cascos disponibles para el selector desplegable.
   * Se carga al inicializar el componente.
   */
  cascos = signal<Casco[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = tabla de ventas visible.
   */
  showForm = signal(false);

  /**
   * UUID de la venta que se está editando actualmente.
   * null = modo creación (POST a /ventas).
   * string = modo edición (PATCH a /ventas/:id).
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error para mostrar en la plantilla junto al formulario.
   * Se limpia al abrir el formulario o tras un guardado exitoso.
   */
  errorMsg = signal('');

  /**
   * Arreglo de los tres estados posibles de una venta.
   * Se usa en la plantilla para generar las opciones del selector `<select>`.
   * Es `readonly` porque los estados son parte del dominio y no deben cambiar en runtime.
   */
  readonly estados: EstadoVenta[] = ['pendiente', 'completada', 'cancelada'];

  /**
   * Mapa de etiquetas legibles en español para cada estado de la venta.
   * Permite mostrar texto amigable en la tabla y el selector sin lógica en la plantilla.
   * Ejemplo: 'pendiente' → 'Pendiente', 'completada' → 'Completada'.
   */
  readonly estadoLabels: Record<EstadoVenta, string> = {
    pendiente: 'Pendiente',
    completada: 'Completada',
    cancelada: 'Cancelada',
  };

  /**
   * Formulario reactivo para crear o editar una venta.
   *
   * Campos:
   *  - id_casco:      UUID del casco vendido (requerido, FK).
   *  - cantidad:      Número de unidades (requerido, mínimo 1).
   *  - estado:        Estado del pedido (requerido, valor inicial 'pendiente').
   *  - fecha_entrega: Fecha de entrega en formato YYYY-MM-DD (opcional).
   *                   Se omite del DTO si está vacía para no enviar null al backend.
   */
  form = this.fb.group({
    id_casco: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    estado: ['pendiente' as EstadoVenta, Validators.required],
    fecha_entrega: [''],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga en paralelo la lista de ventas y la lista de cascos para el selector.
   */
  ngOnInit() {
    this.load();
    this.cascosSvc.getAll().subscribe(d => this.cascos.set(d));
  }

  /**
   * Obtiene todas las ventas del backend y actualiza el signal `items`.
   * Se invoca en `ngOnInit` y después de cada operación CRUD exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para registrar una nueva venta.
   * Reinicia los campos con valores por defecto: estado 'pendiente', cantidad 1.
   */
  openCreate() {
    this.editingId.set(null); // Sin ID → modo creación
    this.errorMsg.set('');
    this.form.reset({ estado: 'pendiente', cantidad: 1, id_casco: '', fecha_entrega: '' });
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar una venta existente.
   * Precarga los valores actuales. La fecha se extrae de la parte "fecha" del
   * string ISO 8601 (p. ej. "2024-12-31T00:00:00.000Z" → "2024-12-31") para
   * que sea compatible con el input type="date" de HTML.
   * @param item - La venta que se desea editar.
   */
  openEdit(item: Venta) {
    this.editingId.set(item.id_venta); // Guarda el ID para el PATCH posterior
    this.errorMsg.set('');
    this.form.patchValue({
      id_casco: item.casco?.id_casco ?? '',
      cantidad: item.cantidad,
      estado: item.estado,
      // Extrae solo la parte de fecha (YYYY-MM-DD) del string ISO para el input date
      fecha_entrega: item.fecha_entrega ? item.fecha_entrega.split('T')[0] : '',
    });
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend (creación o actualización según `editingId`).
   *
   * Construcción del DTO:
   *  - Siempre incluye `id_casco`, `cantidad` (como number) y `estado`.
   *  - Solo agrega `fecha_entrega` si el usuario la proporcionó, para evitar
   *    enviar un string vacío que el backend podría rechazar o interpretar como fecha nula.
   *
   * Tras el éxito oculta el formulario y recarga la lista de ventas.
   */
  save() {
    if (this.form.invalid) return;
    const id = this.editingId();
    const raw = this.form.value;

    // Construye el DTO explícitamente para controlar qué campos se envían
    const dto: Record<string, unknown> = {
      id_casco: raw.id_casco,
      cantidad: Number(raw.cantidad), // Asegura que sea number, no string
      estado: raw.estado,
    };
    // La fecha de entrega es opcional: solo se incluye si el usuario la ingresó
    if (raw.fecha_entrega) dto['fecha_entrega'] = raw.fecha_entrega;

    const obs = id ? this.service.update(id, dto) : this.service.create(dto);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(this.parseError(err)),
    });
  }

  /**
   * Elimina una venta tras pedir confirmación al usuario.
   * Muestra el mensaje de error del servidor en un alert si la operación falla.
   * @param id - UUID de la venta a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar esta venta?')) return;
    this.service.remove(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(this.parseError(err)),
    });
  }

  /**
   * Cancela la operación en curso y oculta el formulario sin guardar cambios.
   */
  cancel() { this.showForm.set(false); }

  /**
   * Devuelve la clase CSS del badge de estado para aplicar colores diferenciados en la tabla.
   * Cada estado tiene una clase específica definida en la hoja de estilos del componente.
   * @param estado - El estado de la venta ('pendiente' | 'completada' | 'cancelada').
   * @returns Nombre de la clase CSS correspondiente al estado.
   */
  badgeClass(estado: EstadoVenta): string {
    return { pendiente: 'badge-pending', completada: 'badge-done', cancelada: 'badge-canceled' }[estado];
  }

  /**
   * Formatea una fecha ISO 8601 a un formato legible para el usuario en español de Guatemala.
   * Si la fecha es null o vacía devuelve el guion largo '—' como indicador de "sin fecha".
   * @param d - Cadena de fecha en formato ISO 8601 o null.
   * @returns Fecha formateada según la localización 'es-GT', o '—' si no hay fecha.
   */
  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-GT');
  }

  /**
   * Extrae el mensaje de error más descriptivo de la respuesta HTTP.
   * Prioridad: mensaje del cuerpo del servidor → mensaje del Error JS → texto genérico.
   * @param err - El objeto de error del callback de error del observable.
   * @returns Cadena de texto con el mensaje de error legible en español.
   */
  private parseError(err: any): string {
    return err?.error?.message ?? err?.message ?? 'Error al procesar la solicitud';
  }
}
