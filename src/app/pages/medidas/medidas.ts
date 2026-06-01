import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MedidasService } from '../../core/services/medidas.service';
import { Medida } from '../../core/models';

/**
 * MedidasPage — módulo de administración de medidas/tallas (CRUD completo).
 *
 * Una "Medida" representa una talla o tamaño de casco (p. ej. S, M, L, XL, XXL,
 * o medidas numéricas como 57-58 cm). Es uno de los catálogos auxiliares del sistema
 * y tiene una relación de clave foránea con la entidad Casco.
 *
 * Esta página permite al administrador mantener el catálogo de medidas:
 * listar las existentes, agregar nuevas, modificar su nombre y eliminar aquellas
 * que no estén referenciadas por ningún casco (el backend impide la eliminación
 * con restricción de integridad referencial).
 *
 * Sigue el mismo patrón de diseño que MarcasPage, TiposPage y CertificadosPage:
 * un signal `showForm` alterna entre la vista de tabla y el formulario inline,
 * mientras que `editingId` determina si la acción es creación (POST) o edición (PATCH).
 */
@Component({
  selector: 'app-medidas',
  imports: [ReactiveFormsModule],
  templateUrl: './medidas.html',
  styleUrl: './medidas.css',
})
export class MedidasPage implements OnInit {
  /** Servicio CRUD para el recurso /medidas de la API REST. */
  private service = inject(MedidasService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de medidas obtenida del backend.
   * La plantilla itera sobre este signal para renderizar la tabla de medidas.
   * Se actualiza tras cada operación de escritura exitosa.
   */
  items = signal<Medida[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = tabla de medidas visible.
   */
  showForm = signal(false);

  /**
   * UUID de la medida que se está editando actualmente.
   * null = modo creación (POST a /medidas).
   * string = modo edición (PATCH a /medidas/:id).
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error para mostrar junto al formulario.
   * Se vacía al abrir el formulario o al guardar con éxito.
   */
  errorMsg = signal('');

  /**
   * Formulario reactivo para crear o editar una medida.
   *
   * Campos:
   *  - talla: Identificador de la talla o medida (requerido).
   *           Ejemplos: "S", "M", "L", "XL", "57-58 cm".
   */
  form = this.fb.group({
    talla: ['', Validators.required],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga la lista de medidas desde la API al montar la vista.
   */
  ngOnInit() { this.load(); }

  /**
   * Obtiene todas las medidas del backend y actualiza el signal `items`.
   * Se invoca en `ngOnInit` y después de cada operación CRUD exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para crear una nueva medida.
   * Limpia el estado previo de edición, reinicia el campo y muestra el formulario.
   */
  openCreate() {
    this.editingId.set(null); // Sin ID → modo creación
    this.errorMsg.set('');
    this.form.reset();
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar una medida existente.
   * Precarga el valor de `talla` para que el usuario lo modifique.
   * @param item - La medida que se desea editar.
   */
  openEdit(item: Medida) {
    this.editingId.set(item.id_medida); // Guarda el ID para el PATCH posterior
    this.errorMsg.set('');
    this.form.patchValue({ talla: item.talla });
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend (creación o actualización).
   * Determina la operación HTTP según el valor de `editingId`:
   *  - null → POST /medidas (create).
   *  - string → PATCH /medidas/:id (update).
   * Tras el éxito oculta el formulario y recarga la lista de medidas.
   */
  save() {
    if (this.form.invalid) return;
    const id = this.editingId();
    const val = this.form.value as Partial<Medida>;
    const obs = id ? this.service.update(id, val) : this.service.create(val);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(err?.error?.message ?? 'Error al guardar'),
    });
  }

  /**
   * Elimina una medida tras pedir confirmación al usuario.
   * Si el backend rechaza la operación (la medida está en uso por algún casco),
   * muestra el error en un alert del navegador.
   * @param id - UUID de la medida a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar esta medida?')) return;
    this.service.remove(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message ?? 'No se puede eliminar (puede tener cascos asociados)'),
    });
  }

  /**
   * Cancela la operación en curso y oculta el formulario sin persistir cambios.
   */
  cancel() { this.showForm.set(false); }
}
