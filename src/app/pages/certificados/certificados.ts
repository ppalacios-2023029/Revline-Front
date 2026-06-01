import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CertificadosService } from '../../core/services/certificados.service';
import { Certificado } from '../../core/models';

/**
 * CertificadosPage — módulo de administración de certificados de seguridad (CRUD completo).
 *
 * Un "Certificado" representa una homologación o estándar de seguridad que puede
 * tener un casco (p. ej. DOT, ECE 22.06, SNELL M2020). Es uno de los catálogos
 * auxiliares del sistema y se vincula a la entidad Casco mediante clave foránea.
 *
 * Esta página permite al administrador:
 *  - Visualizar todos los certificados registrados.
 *  - Registrar nuevos certificados con tipo y descripción opcional.
 *  - Modificar un certificado existente.
 *  - Eliminar certificados que no estén vinculados a ningún casco.
 *
 * Sigue exactamente el mismo patrón CRUD que MarcasPage, MedidasPage y TiposPage:
 * formulario inline controlado por el signal `showForm`, con `editingId` distinguiendo
 * entre modo creación (POST) y modo edición (PATCH).
 */
@Component({
  selector: 'app-certificados',
  imports: [ReactiveFormsModule],
  templateUrl: './certificados.html',
  styleUrl: './certificados.css',
})
export class CertificadosPage implements OnInit {
  /** Servicio CRUD para el recurso /certificados de la API REST. */
  private service = inject(CertificadosService);

  /** Constructor de formularios reactivos de Angular. */
  private fb = inject(FormBuilder);

  /**
   * Lista reactiva de certificados obtenida del backend.
   * La plantilla itera sobre este signal para renderizar la tabla.
   * Se actualiza tras cada operación de escritura exitosa.
   */
  items = signal<Certificado[]>([]);

  /**
   * Controla la visibilidad del formulario de creación/edición.
   * true = formulario visible; false = tabla de certificados visible.
   */
  showForm = signal(false);

  /**
   * UUID del certificado que se está editando.
   * null = modo creación (POST a /certificados).
   * string = modo edición (PATCH a /certificados/:id).
   */
  editingId = signal<string | null>(null);

  /**
   * Mensaje de error para mostrar en la plantilla junto al formulario.
   * Se limpia al abrir el formulario o tras un guardado exitoso.
   */
  errorMsg = signal('');

  /**
   * Formulario reactivo para crear o editar un certificado de seguridad.
   *
   * Campos:
   *  - tipo:        Identificador del estándar de seguridad (requerido).
   *                 Ejemplos: "DOT", "ECE 22.06", "SNELL M2020".
   *  - descripcion: Descripción adicional del certificado (opcional).
   *                 Puede incluir detalles sobre los requisitos o la entidad certificadora.
   */
  form = this.fb.group({
    tipo: ['', Validators.required],
    descripcion: [''],
  });

  /**
   * Ciclo de vida: se ejecuta al inicializar el componente.
   * Carga la lista de certificados desde la API.
   */
  ngOnInit() { this.load(); }

  /**
   * Obtiene todos los certificados del backend y actualiza el signal `items`.
   * Se invoca en `ngOnInit` y después de cada operación CRUD exitosa.
   */
  load() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }

  /**
   * Prepara el formulario para crear un nuevo certificado.
   * Limpia el estado de edición, reinicia todos los campos y muestra el formulario.
   */
  openCreate() {
    this.editingId.set(null); // Sin ID → modo creación
    this.errorMsg.set('');
    this.form.reset();
    this.showForm.set(true);
  }

  /**
   * Prepara el formulario para editar un certificado existente.
   * Precarga los valores de `tipo` y `descripcion` para que el usuario los modifique.
   * @param item - El certificado que se desea editar.
   */
  openEdit(item: Certificado) {
    this.editingId.set(item.id_certificado); // Guarda el ID para el PATCH posterior
    this.errorMsg.set('');
    this.form.patchValue({ tipo: item.tipo, descripcion: item.descripcion });
    this.showForm.set(true);
  }

  /**
   * Envía el formulario al backend (creación o actualización según `editingId`).
   * - editingId null → POST /certificados.
   * - editingId string → PATCH /certificados/:id.
   * Tras el éxito oculta el formulario y recarga la lista de certificados.
   */
  save() {
    if (this.form.invalid) return;
    const id = this.editingId();
    const val = this.form.value as Partial<Certificado>;
    const obs = id ? this.service.update(id, val) : this.service.create(val);
    obs.subscribe({
      next: () => { this.errorMsg.set(''); this.showForm.set(false); this.load(); },
      error: (err) => this.errorMsg.set(err?.error?.message ?? 'Error al guardar'),
    });
  }

  /**
   * Elimina un certificado tras pedir confirmación al usuario.
   * Si el certificado está asociado a uno o más cascos, el backend responde con
   * error de integridad referencial y se muestra el mensaje en un alert.
   * @param id - UUID del certificado a eliminar.
   */
  delete(id: string) {
    if (!confirm('¿Eliminar este certificado?')) return;
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
