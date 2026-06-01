// Injectable marca esta clase como un proveedor gestionado por el inyector de Angular.
// inject es la función funcional para inyectar dependencias de forma declarativa.
import { Injectable, inject } from '@angular/core';

// HttpClient ofrece una API tipada para comunicarse con servicios HTTP externos.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio que describe la estructura de un certificado de seguridad.
import { Certificado } from '../models';

// Constante con la URL raíz del backend de la aplicación.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Certificado.
 *
 * Encapsula las llamadas HTTP al endpoint `/certificados` del backend NestJS.
 * Los certificados de seguridad acreditan que un casco cumple estándares
 * internacionales de protección, tales como DOT (EE.UU.), ECE 22.06 (Europa)
 * o SNELL (estándar independiente).
 *
 * Con `providedIn: 'root'`, Angular instancia este servicio una sola vez
 * y lo comparte entre todos los componentes que lo requieran.
 */
@Injectable({ providedIn: 'root' })
export class CertificadosService {
  // Inyecta HttpClient sin necesidad de constructor; patrón recomendado en Angular moderno.
  private http = inject(HttpClient);

  // URL del recurso de certificados construida a partir de la base de la API.
  // Ejemplo: 'http://localhost:3001/certificados'
  private url = `${API_URL}/certificados`;

  /**
   * Obtiene todos los certificados de seguridad registrados.
   * @returns Observable que emite un arreglo de objetos `Certificado`.
   */
  getAll() { return this.http.get<Certificado[]>(this.url); }

  /**
   * Crea un nuevo certificado de seguridad en el sistema.
   * @param dto Objeto con los campos `tipo` y `descripcion` del certificado.
   *            El backend genera y asigna el `id_certificado` (UUID).
   * @returns Observable que emite el objeto `Certificado` recién creado.
   */
  create(dto: Partial<Certificado>) { return this.http.post<Certificado>(this.url, dto); }

  /**
   * Actualiza parcialmente un certificado de seguridad existente (HTTP PATCH).
   * Permite modificar solo los campos que se incluyan en `dto`.
   * @param id  UUID del certificado a actualizar.
   * @param dto Campos a modificar (`tipo` y/o `descripcion`).
   * @returns Observable que emite el objeto `Certificado` actualizado.
   */
  update(id: string, dto: Partial<Certificado>) { return this.http.patch<Certificado>(`${this.url}/${id}`, dto); }

  /**
   * Elimina un certificado de seguridad del sistema de forma permanente.
   * El backend retornará un error 400 si algún casco usa este certificado,
   * ya que no se puede romper la integridad referencial.
   * @param id UUID del certificado a eliminar.
   * @returns Observable que completa sin emitir ningún valor.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
