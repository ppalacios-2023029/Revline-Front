import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MarcasService } from '../../core/services/marcas.service';
import { Marca } from '../../core/models';

/**
 * MarcasPage — módulo de administración de marcas (CRUD completo).
 *
 * Una "Marca" es uno de los catálogos auxiliares del sistema: representa el
 * fabricante o la marca comercial de un casco (p. ej. HJC, Bell, Shoei).
 * Cada casco tiene exactamente una marca asociada mediante clave foránea.
 *
 * Esta página lista todas las marcas registradas, permite crear nuevas,
 * editar las existentes y eliminar aquellas que no tengan cascos asociados
 * (el backend rechaza la eliminación con un error 400 en ese caso).
 *
 * Patrón de diseño:
 *  La tabla y el formulario comparten la misma vista: el formulario se
 *  muestra/oculta con el signal `showForm`, mientras que `editingId`
 *  determina si se ejecuta un POST (creación) o un PATCH (edición).
 */
@Component({
  selector: 'app-marcas',
  imports: [ReactiveFormsModule],
  templateUrl: './marcas.html',
  styleUrl: './marcas.css',
})
export class MarcasPage implements OnInit {
  /** Servicio CRUD para el recurso /marcas de la API REST. */
  private service = inject(MarcasService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de marcas obtenida del backend.
   * La plantilla itera sobre este signal para renderizar la tabla.
   * Se actualiza tras cada operación de escritura exitosa.
   */
  items = signal<Marca[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = vista de tabla activa.
   */
  showForm = signal(false);

  /**
   * UUID de la marca que se está editando.
   * null = modo creación (POST a /marcas).
   * string = modo edición (PATCH a /marcas/:id).
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error para mostrar en la plantilla junto al formulario.
   * Se limpia al abrir el formulario o tras un guardado exitoso.
   */
  errorMsg = signal('');

  /**
   * Formulario reactivo para crear o editar una marca.
   *
   * Campos:
   *  - nombre:      Nombre de la marca (requerido, max length sin límite en frontend).
   *  - descripcion: Descripción opcional de la marca.
   */
  form = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga la lista inicial de marcas desde la API.
   */
  ngOnInit() { this.load(); }

  /**
   * Obtiene todas las marcas del backend y actualiza el signal `items`.
   * Se invoca en `ngOnInit` y después de cada operación CRUD exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para crear una nueva marca.
   * Restablece todos los campos a sus valores vacíos y muestra el formulario.
   */
  openCreate() {
    this.editingId.set(null); // Sin ID previo → modo creación
    this.errorMsg.set('');
    this.form.reset();
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar una marca existente.
   * Precarga los valores actuales en los controles para que el usuario los modifique.
   * @param item - La marca que se desea editar.
   */
  openEdit(item: Marca) {
    this.editingId.set(item.id_marca); // Guarda el ID para el PATCH posterior
    this.errorMsg.set('');
    this.form.patchValue({ nombre: item.nombre, descripcion: item.descripcion });
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend.
   * - Si `editingId` tiene valor: llama a update() → PATCH /marcas/:id.
   * - Si `editingId` es null: llama a create() → POST /marcas.
   * Tras el éxito oculta el formulario y recarga la lista.
   * En caso de error muestra el mensaje recibido del servidor.
   */
  save() {
    if (this.form.invalid) return; // No enviar si hay campos inválidos
    const id = this.editingId();
    const val = this.form.value as Partial<Marca>;
    // Selecciona la operación correcta según el modo actual
    const obs = id ? this.service.update(id, val) : this.service.create(val);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(err?.error?.message ?? 'Error al guardar'),
    });
  }

  /**
   * Elimina una marca tras pedir confirmación al usuario.
   * Si el backend responde con error (p. ej. la marca tiene cascos asociados),
   * se muestra el mensaje en un alert del navegador.
   * @param id - UUID de la marca a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar esta marca?')) return;
    this.service.remove(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.message ?? 'No se puede eliminar (puede tener cascos asociados)'),
    });
  }

  /**
   * Cancela la operación en curso y oculta el formulario sin guardar.
   */
  cancel() { this.showForm.set(false); }
}
