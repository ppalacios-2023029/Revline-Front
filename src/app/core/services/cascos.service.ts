// Injectable registra el servicio en el árbol de inyección de Angular.
// inject es la API funcional para obtener dependencias sin usar el constructor.
import { Injectable, inject } from '@angular/core';

// HttpClient proporciona los métodos para realizar peticiones HTTP tipadas al backend.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio principal que describe la estructura completa de un casco,
// incluyendo sus relaciones anidadas (Marca, Medida, Tipo, Certificado).
import { Casco } from '../models';

// URL base del servidor backend NestJS.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Casco.
 *
 * Es el servicio más completo de la aplicación, ya que `Casco` es la entidad
 * central del dominio. Se comunica con el endpoint `/cascos` del backend y
 * gestiona todas las operaciones CRUD, así como la obtención del catálogo
 * de cascos agrupados para la vista pública de tienda.
 *
 * El backend devuelve los cascos con todas sus relaciones cargadas de forma
 * eager (marca, medida, tipo, certificado), por lo que el frontend recibe
 * objetos completamente hidratados sin necesidad de peticiones adicionales.
 *
 * `providedIn: 'root'` garantiza una única instancia del servicio en toda la app.
 */
@Injectable({ providedIn: 'root' })
export class CascosService {
  // Inyección funcional de HttpClient para realizar las peticiones HTTP.
  private http = inject(HttpClient);

  // URL base del endpoint de cascos.
  // Ejemplo: 'http://localhost:3001/cascos'
  private url = `${API_URL}/cascos`;

  /**
   * Obtiene el listado completo de cascos del sistema (vista de administración).
   * Devuelve todos los registros sin agrupar, con todas sus relaciones eager.
   * @returns Observable que emite un arreglo de objetos `Casco`.
   */
  getAll() { return this.http.get<Casco[]>(this.url); }

  /**
   * Obtiene los cascos preparados para el catálogo público de la tienda.
   * El backend agrupa las variantes del mismo modelo por talla y adjunta
   * las propiedades `tallas` y `variantes` a cada objeto `Casco`.
   * Este endpoint se usa en las páginas `HomePage` y `CatalogoPage`.
   * @returns Observable que emite un arreglo de `Casco` enriquecidos con variantes.
   */
  getCatalog() { return this.http.get<Casco[]>(`${this.url}/catalogo`); }

  /**
   * Crea un nuevo casco en el sistema.
   * El `dto` se tipifica como `object` porque puede incluir campos de relaciones
   * (id_marca, id_medida, id_tipo, id_certificado) además de los campos propios del casco.
   * El backend valida que los IDs de las relaciones existan antes de persistir.
   * @param dto Objeto con los campos requeridos para crear el casco.
   * @returns Observable que emite el objeto `Casco` creado por el backend.
   */
  create(dto: object) { return this.http.post<Casco>(this.url, dto); }

  /**
   * Actualiza parcialmente un casco existente (HTTP PATCH).
   * Permite modificar cualquier campo del casco, incluidas sus relaciones,
   * enviando solo los campos que deben cambiar.
   * @param id  UUID del casco a modificar.
   * @param dto Campos a actualizar.
   * @returns Observable que emite el objeto `Casco` con los datos actualizados.
   */
  update(id: string, dto: object) { return this.http.patch<Casco>(`${this.url}/${id}`, dto); }

  /**
   * Elimina un casco del catálogo de forma permanente.
   * Si el casco tiene registros de inventario o ventas asociados,
   * el backend puede rechazar la operación para preservar la integridad de datos.
   * @param id UUID del casco a eliminar.
   * @returns Observable que completa sin emitir datos al finalizar la eliminación.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
