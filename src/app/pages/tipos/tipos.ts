import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TiposService } from '../../core/services/tipos.service';
import { Tipo } from '../../core/models';

/**
 * TiposPage — módulo de administración de tipos de casco (CRUD completo).
 *
 * Un "Tipo" clasifica el estilo o uso del casco (p. ej. Integral, Modular,
 * Motocross, Half-face, Off-road). Es uno de los catálogos auxiliares del sistema
 * y se relaciona con la entidad Casco mediante clave foránea.
 *
 * Esta página permite:
 *  - Listar todos los tipos de casco registrados en el sistema.
 *  - Crear nuevos tipos con nombre y descripción opcional.
 *  - Editar tipos existentes.
 *  - Eliminar tipos que no estén referenciados por ningún casco
 *    (el backend rechaza la operación si hay cascos asociados).
 *
 * Sigue el mismo patrón CRUD inline que MarcasPage y MedidasPage:
 * un formulario que aparece sobre la tabla controlado por el signal `showForm`.
 */
@Component({
  selector: 'app-tipos',
  imports: [ReactiveFormsModule],
  templateUrl: './tipos.html',
  styleUrl: './tipos.css',
})
export class TiposPage implements OnInit {
  /** Servicio CRUD para el recurso /tipos de la API REST. */
  private service = inject(TiposService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de tipos de casco obtenida del backend.
   * Se actualiza tras cada operación CRUD exitosa para mantener la vista sincronizada.
   */
  items = signal<Tipo[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = tabla de tipos visible.
   */
  showForm = signal(false);

  /**
   * UUID del tipo que se está editando.
   * null = modo creación (POST a /tipos).
   * string = modo edición (PATCH a /tipos/:id).
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error para mostrar en la plantilla junto al formulario.
   * Se limpia al abrir el formulario o al guardar correctamente.
   */
  errorMsg = signal('');

  /**
   * Formulario reactivo para crear o editar un tipo de casco.
   *
   * Campos:
   *  - nombre:      Nombre del tipo (requerido). P. ej. "Integral", "Modular".
   *  - descripcion: Descripción adicional del tipo (opcional).
   */
  form = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga la lista de tipos desde la API al montar la vista.
   */
  ngOnInit() { this.load(); }

  /**
   * Obtiene todos los tipos del backend y actualiza el signal `items`.
   * Se invoca en `ngOnInit` y tras cada operación de escritura exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para crear un nuevo tipo de casco.
   * Reinicia todos los campos y muestra el formulario en modo creación.
   */
  openCreate() {
    this.editingId.set(null); // Sin ID → POST al guardar
    this.errorMsg.set('');
    this.form.reset();
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar un tipo existente.
   * Precarga nombre y descripción para que el usuario los modifique.
   * @param item - El tipo de casco que se desea editar.
   */
  openEdit(item: Tipo) {
    this.editingId.set(item.id_tipo); // Guarda el ID para el PATCH posterior
    this.errorMsg.set('');
    this.form.patchValue({ nombre: item.nombre, descripcion: item.descripcion });
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend (creación o actualización).
   * Selecciona POST o PATCH según el valor de `editingId`.
   * Tras el éxito oculta el formulario y recarga la lista.
   */
  save() {
    if (this.form.invalid) return;
    const id = this.editingId();
    const val = this.form.value as Partial<Tipo>;
    // Selecciona la operación según el modo actual
    const obs = id ? this.service.update(id, val) : this.service.create(val);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(err?.error?.message ?? 'Error al guardar'),
    });
  }

  /**
   * Elimina un tipo tras pedir confirmación.
   * Si hay cascos que usan este tipo, el backend devuelve un error 400 (FK violation)
   * que se muestra en un alert del navegador.
   * @param id - UUID del tipo a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar este tipo?')) return;
    this.service.remove(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message ?? 'No se puede eliminar (puede tener cascos asociados)'),
    });
  }

  /**
   * Cancela la operación en curso y oculta el formulario sin guardar cambios.
   */
  cancel() { this.showForm.set(false); }
}
