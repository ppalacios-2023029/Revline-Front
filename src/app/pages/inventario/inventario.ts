import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventarioService } from '../../core/services/inventario.service';
import { CascosService } from '../../core/services/cascos.service';
import { Inventario, Casco } from '../../core/models';

/**
 * InventarioPage — módulo de administración del inventario de cascos (CRUD completo).
 *
 * El inventario registra la cantidad de unidades disponibles para cada casco
 * en una relación 1-a-1 (un casco tiene exactamente un registro de inventario).
 * Además del stock (`cantidad`), incluye un campo `activo` que indica si el
 * casco está disponible para la venta en el catálogo público.
 *
 * Consideraciones especiales del formulario:
 *  - Al CREAR: el campo `id_casco` está habilitado y es obligatorio (el backend
 *    verifica que el casco exista y que no tenga ya un inventario registrado).
 *  - Al EDITAR: el campo `id_casco` se DESHABILITA para evitar que el usuario
 *    intente reasignar el inventario a otro casco, lo cual violaría la unicidad
 *    y forzaría una verificación redundante en el backend.
 *  - El DTO de actualización solo incluye `cantidad` y `activo`, omitiendo
 *    `id_casco` para no re-disparar la validación de unicidad del backend.
 *
 * Carga auxiliar:
 *  Al inicializar también se obtiene la lista completa de cascos para poblar
 *  el selector desplegable del formulario de creación.
 */
@Component({
  selector: 'app-inventario',
  imports: [ReactiveFormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class InventarioPage implements OnInit {
  /** Servicio CRUD para el recurso /inventario de la API REST. */
  private service = inject(InventarioService);

  /** Servicio de cascos utilizado para poblar el selector del formulario. */
  private cascosSvc = inject(CascosService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de registros de inventario obtenida del backend.
   * Se actualiza tras cada operación CRUD exitosa.
   */
  items = signal<Inventario[]>([]);

  /**
   * Lista reactiva de cascos disponibles para el selector desplegable.
   * Se carga al inicializar el componente y no cambia hasta recargar la página.
   */
  cascos = signal<Casco[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = tabla de inventario visible.
   */
  showForm = signal(false);

  /**
   * UUID del registro de inventario que se está editando.
   * null = modo creación (POST a /inventario).
   * string = modo edición (PATCH a /inventario/:id).
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error para mostrar en la plantilla junto al formulario.
   * Se limpia al abrir el formulario o tras un guardado exitoso.
   */
  errorMsg = signal('');

  /**
   * Formulario reactivo para crear o editar un registro de inventario.
   *
   * Campos:
   *  - id_casco:  UUID del casco al que pertenece este stock (requerido en creación,
   *               deshabilitado en edición para evitar reasignación).
   *  - cantidad:  Número de unidades disponibles (requerido, mínimo 0).
   *  - activo:    Indica si el casco aparece disponible en el catálogo público (boolean).
   */
  form = this.fb.group({
    id_casco: ['', Validators.required],
    cantidad: [0, [Validators.required, Validators.min(0)]],
    activo: [true],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga en paralelo la lista de inventario y la lista de cascos para el selector.
   */
  ngOnInit() {
    this.load();
    this.cascosSvc.getAll().subscribe(d => this.cascos.set(d));
  }

  /**
   * Obtiene todos los registros de inventario y actualiza el signal `items`.
   * Se invoca en `ngOnInit` y después de cada operación CRUD exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para crear un nuevo registro de inventario.
   * Reinicia todos los campos con sus valores por defecto, habilita el selector
   * de casco (que puede haber quedado deshabilitado de una edición previa)
   * y muestra el formulario.
   */
  openCreate() {
    this.editingId.set(null); // Sin ID → modo creación
    this.errorMsg.set('');
    // Reinicia con valores por defecto: activo = true, cantidad = 0, sin casco seleccionado
    this.form.reset({ activo: true, cantidad: 0, id_casco: '' });
    // El campo id_casco debe estar habilitado en modo creación
    this.form.get('id_casco')!.enable();
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar un registro de inventario existente.
   * Precarga los valores actuales y DESHABILITA el campo `id_casco` para impedir
   * que el usuario intente cambiar el casco asociado (relación 1-a-1 fija).
   * @param item - El registro de inventario que se desea editar.
   */
  openEdit(item: Inventario) {
    this.editingId.set(item.id_inventario); // Guarda el ID para el PATCH posterior
    this.errorMsg.set('');
    this.form.patchValue({
      id_casco: item.casco?.id_casco ?? '',
      cantidad: item.cantidad,
      activo: item.activo,
    });
    // Disable id_casco on edit so it doesn't get re-validated by backend
    // (evita que el backend re-evalúe la unicidad del casco al hacer PATCH)
    this.form.get('id_casco')!.disable();
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend (creación o actualización según `editingId`).
   *
   * Lógica del DTO:
   *  - En modo edición: solo envía `cantidad` y `activo` para no re-disparar
   *    la validación de unicidad de casco en el backend.
   *  - En modo creación: envía el formulario completo con `getRawValue()`
   *    para incluir también los campos deshabilitados si los hubiera.
   */
  save() {
    if (this.form.invalid) return;
    const id = this.editingId();

    // On update, only send cantidad and activo (avoid re-triggering casco uniqueness check)
    const dto = id
      ? { cantidad: this.form.get('cantidad')!.value, activo: this.form.get('activo')!.value }
      : this.form.getRawValue(); // getRawValue incluye controles deshabilitados

    const obs = id ? this.service.update(id, dto) : this.service.create(dto);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(this.parseError(err)),
    });
  }

  /**
   * Elimina un registro de inventario tras pedir confirmación.
   * Muestra el error del backend en un alert si la operación falla.
   * @param id - UUID del registro de inventario a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar este registro de inventario?')) return;
    this.service.remove(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(this.parseError(err)),
    });
  }

  /**
   * Cancela la operación en curso, re-habilita el campo `id_casco` (por si estaba
   * deshabilitado desde una edición) y oculta el formulario sin guardar cambios.
   */
  cancel() {
    this.form.get('id_casco')!.enable(); // Garantiza que el campo quede habilitado para la próxima apertura
    this.showForm.set(false);
  }

  /**
   * Extrae el mensaje de error más descriptivo de la respuesta HTTP.
   * Prioridad: mensaje del cuerpo de respuesta del servidor → mensaje del Error JS → texto genérico.
   * @param err - El objeto de error del callback de error del observable.
   * @returns Cadena de texto con el mensaje de error legible en español.
   */
  private parseError(err: any): string {
    return err?.error?.message ?? err?.message ?? 'Error al procesar la solicitud';
  }
}
