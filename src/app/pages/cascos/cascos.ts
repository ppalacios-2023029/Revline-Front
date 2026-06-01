import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CascosService } from '../../core/services/cascos.service';
import { MarcasService } from '../../core/services/marcas.service';
import { MedidasService } from '../../core/services/medidas.service';
import { TiposService } from '../../core/services/tipos.service';
import { CertificadosService } from '../../core/services/certificados.service';
import { Casco, Marca, Medida, Tipo, Certificado } from '../../core/models';

/**
 * CascosPage — módulo de administración del catálogo de cascos (CRUD completo).
 *
 * Esta página permite al administrador gestionar la entidad central del sistema:
 * los cascos. Cada casco tiene relaciones de clave foránea con Marca, Medida,
 * Tipo y Certificado, por lo que al abrir el formulario se cargan todas esas
 * listas para los selectores desplegables.
 *
 * Flujo general:
 *  1. Al inicializar, carga la lista de cascos y los cuatro catálogos auxiliares.
 *  2. El usuario puede crear un nuevo casco o editar uno existente.
 *  3. El formulario reactivo valida los campos requeridos antes de enviar al backend.
 *  4. Las URLs de imágenes se ingresan como texto separado por saltos de línea
 *     y se convierten al arreglo `files[]` antes de enviar el DTO.
 *  5. Al guardar o eliminar con éxito, se recarga la lista completa.
 */
@Component({
  selector: 'app-cascos',
  imports: [ReactiveFormsModule],
  templateUrl: './cascos.html',
  styleUrl: './cascos.css',
})
export class CascosPage implements OnInit {
  /** Servicio CRUD para el recurso /cascos. */
  private service = inject(CascosService);

  /** Servicio de solo lectura para poblar el selector de marcas. */
  private marcasSvc = inject(MarcasService);

  /** Servicio de solo lectura para poblar el selector de medidas/tallas. */
  private medidasSvc = inject(MedidasService);

  /** Servicio de solo lectura para poblar el selector de tipos de casco. */
  private tiposSvc = inject(TiposService);

  /** Servicio de solo lectura para poblar el selector de certificados de seguridad. */
  private certsSvc = inject(CertificadosService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de cascos obtenida del backend.
   * Se actualiza tras cada operación de creación, edición o eliminación.
   */
  items = signal<Casco[]>([]);

  /** Lista reactiva de marcas disponibles para el selector del formulario. */
  marcas = signal<Marca[]>([]);

  /** Lista reactiva de medidas/tallas disponibles para el selector del formulario. */
  medidas = signal<Medida[]>([]);

  /** Lista reactiva de tipos de casco disponibles para el selector del formulario. */
  tipos = signal<Tipo[]>([]);

  /** Lista reactiva de certificados de seguridad para el selector del formulario. */
  certificados = signal<Certificado[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = formulario oculto (vista de tabla).
   */
  showForm = signal(false);

  /**
   * UUID del casco que se está editando actualmente.
   * null indica que el formulario está en modo creación (POST).
   * Un string indica modo edición (PATCH/PUT) y su valor se usa en la URL del endpoint.
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error proveniente del servidor o de validación local.
   * Se muestra en la plantilla junto al formulario. Vacío cuando no hay error.
   */
  errorMsg = signal('');

  /**
   * Formulario reactivo para crear o editar un casco.
   *
   * Campos:
   *  - nombre:         Nombre comercial del casco (requerido).
   *  - precio:         Precio de venta en la moneda local (requerido, mínimo 0).
   *  - descripcion:    Descripción larga o características del producto (opcional).
   *  - files:          URLs de imágenes separadas por salto de línea "\n" (opcional).
   *  - id_marca:       UUID de la marca asociada (requerido, FK).
   *  - id_medida:      UUID de la medida/talla asociada (requerido, FK).
   *  - id_tipo:        UUID del tipo de casco asociado (requerido, FK).
   *  - id_certificado: UUID del certificado de seguridad asociado (requerido, FK).
   */
  form = this.fb.group({
    nombre: ['', Validators.required],
    precio: [null as number | null, [Validators.required, Validators.min(0)]],
    descripcion: [''],
    files: [''],
    id_marca: ['', Validators.required],
    id_medida: ['', Validators.required],
    id_tipo: ['', Validators.required],
    id_certificado: ['', Validators.required],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga en paralelo la lista de cascos y los cuatro catálogos auxiliares
   * necesarios para los selectores del formulario.
   */
  ngOnInit() {
    this.load();
    this.marcasSvc.getAll().subscribe(d => this.marcas.set(d));
    this.medidasSvc.getAll().subscribe(d => this.medidas.set(d));
    this.tiposSvc.getAll().subscribe(d => this.tipos.set(d));
    this.certsSvc.getAll().subscribe(d => this.certificados.set(d));
  }

  /**
   * Obtiene la lista completa de cascos desde la API y actualiza el signal `items`.
   * Se llama en `ngOnInit` y después de cada operación de escritura exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para crear un nuevo casco.
   * Limpia el estado de edición, reinicia todos los campos y muestra el formulario.
   */
  openCreate() {
    this.editingId.set(null);   // Modo creación: sin ID previo
    this.errorMsg.set('');
    this.form.reset();
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar un casco existente.
   * Precarga los valores actuales del casco en los controles del formulario.
   * Las URLs de imágenes (arreglo) se convierten a texto multilínea para el textarea.
   * @param item - El objeto Casco que se desea modificar.
   */
  openEdit(item: Casco) {
    this.editingId.set(item.id_casco); // Modo edición: guarda el UUID para el PATCH
    this.errorMsg.set('');
    this.form.patchValue({
      nombre: item.nombre,
      precio: Number(item.precio),
      descripcion: item.descripcion ?? '',
      // Convierte el arreglo de URLs a texto separado por saltos de línea
      files: (item.files ?? []).join('\n'),
      id_marca: item.marca?.id_marca ?? '',
      id_medida: item.medida?.id_medida ?? '',
      id_tipo: item.tipo?.id_tipo ?? '',
      id_certificado: item.certificado?.id_certificado ?? '',
    });
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend (creación o actualización según `editingId`).
   *
   * Proceso:
   * 1. Valida el formulario; aborta si hay campos inválidos.
   * 2. Convierte el texto multilínea de `files` en un arreglo de URLs limpias,
   *    eliminando líneas vacías o con solo espacios en blanco.
   * 3. Construye el DTO uniendo el resto de los campos con el arreglo `files`.
   * 4. Llama a create() o update() según corresponda y gestiona éxito/error.
   */
  save() {
    if (this.form.invalid) return;
    const id = this.editingId();
    const raw = this.form.value;

    // Convierte el campo de texto multilínea en un arreglo de URLs válidas
    const files = (raw.files ?? '')
      .split('\n')
      .map((u: string) => u.trim())
      .filter(Boolean); // Elimina cadenas vacías

    const dto = { ...raw, files }; // El arreglo sobreescribe el string original

    // Elige el observable según si es creación o edición
    const obs = id ? this.service.update(id, dto) : this.service.create(dto);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(this.parseError(err)),
    });
  }

  /**
   * Elimina un casco tras pedir confirmación al usuario.
   * Si el backend rechaza la eliminación (p. ej. por ventas asociadas),
   * muestra el mensaje de error en un alert del navegador.
   * @param id - UUID del casco a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar este casco?')) return;
    this.service.remove(id).subscribe({
      next: () => this.load(),
      error: (err) => alert(this.parseError(err)),
    });
  }

  /**
   * Cancela la operación actual y oculta el formulario sin guardar cambios.
   */
  cancel() { this.showForm.set(false); }

  /**
   * Extrae el mensaje de error más descriptivo disponible desde la respuesta HTTP.
   * Intenta primero el mensaje del cuerpo de la respuesta del servidor (`err.error.message`),
   * luego el mensaje genérico del Error de JavaScript, y finalmente un texto por defecto.
   * @param err - El objeto de error recibido en el callback de error del observable.
   * @returns Cadena de texto con el mensaje de error legible.
   */
  private parseError(err: any): string {
    return err?.error?.message ?? err?.message ?? 'Error al procesar la solicitud';
  }
}
