// Injectable permite que Angular registre esta clase en el sistema de inyección de dependencias.
// inject es la función funcional de DI (alternativa al constructor) disponible desde Angular 14+.
import { Injectable, inject } from '@angular/core';

// HttpClient es el cliente HTTP de Angular; expone métodos tipados (get, post, patch, delete)
// que devuelven Observables para comunicarse con APIs REST.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio que representa una marca de casco.
import { Marca } from '../models';

// URL base del backend NestJS.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Marca.
 *
 * Expone métodos CRUD que se comunican con el endpoint `/marcas` del backend.
 * Cada método devuelve un Observable: el componente que lo consuma debe
 * suscribirse (o usar `async pipe`) para obtener el resultado.
 *
 * `providedIn: 'root'` registra el servicio como singleton en el inyector raíz,
 * lo que significa que existe una única instancia compartida en toda la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class MarcasService {
  // Inyecta HttpClient usando la API funcional de DI (sin constructor).
  // `private` evita que el cliente HTTP sea accedido desde fuera del servicio.
  private http = inject(HttpClient);

  // Endpoint base para todas las operaciones sobre marcas.
  // Se construye concatenando la URL raíz del backend con el segmento '/marcas'.
  private url = `${API_URL}/marcas`;

  /**
   * Obtiene todas las marcas registradas en el sistema.
   * @returns Observable que emite un arreglo de objetos `Marca`.
   */
  getAll() { return this.http.get<Marca[]>(this.url); }

  /**
   * Crea una nueva marca enviando los datos al backend.
   * @param dto Objeto parcial con los campos requeridos para crear la marca
   *            (nombre, descripcion). El ID lo genera el backend.
   * @returns Observable que emite el objeto `Marca` recién creado.
   */
  create(dto: Partial<Marca>) { return this.http.post<Marca>(this.url, dto); }

  /**
   * Actualiza parcialmente una marca existente (HTTP PATCH).
   * Solo los campos incluidos en `dto` se modifican en el backend.
   * @param id   UUID de la marca a actualizar.
   * @param dto  Campos a modificar (nombre y/o descripcion).
   * @returns Observable que emite el objeto `Marca` actualizado.
   */
  update(id: string, dto: Partial<Marca>) { return this.http.patch<Marca>(`${this.url}/${id}`, dto); }

  /**
   * Elimina una marca del sistema de forma permanente.
   * El backend retornará 400 si la marca está referenciada por algún casco (FK constraint).
   * @param id UUID de la marca a eliminar.
   * @returns Observable que completa sin emitir valor (`void`) al finalizar.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
