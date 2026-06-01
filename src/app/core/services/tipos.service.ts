// Injectable habilita que Angular gestione el ciclo de vida de este servicio
// a través de su sistema de inyección de dependencias.
// inject es la API funcional para obtener dependencias sin declarar un constructor.
import { Injectable, inject } from '@angular/core';

// HttpClient es el servicio oficial de Angular para peticiones HTTP.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio que describe la estructura de un tipo de casco.
import { Tipo } from '../models';

// Constante con la URL raíz de la API REST del backend.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Tipo.
 *
 * Proporciona operaciones CRUD contra el endpoint `/tipos` del backend NestJS.
 * Los tipos de casco clasifican el diseño según su cobertura y uso:
 * integral, modular, abierto (jet), off-road, entre otros.
 *
 * El decorador `providedIn: 'root'` asegura que exista un único singleton
 * disponible en toda la aplicación, sin necesidad de declararlo en ningún módulo.
 */
@Injectable({ providedIn: 'root' })
export class TiposService {
  // Inyección funcional de HttpClient: equivalente a declararlo en el constructor
  // pero más conciso y compatible con el enfoque standalone de Angular.
  private http = inject(HttpClient);

  // URL base del recurso de tipos en el backend.
  // Ejemplo resultante: 'http://localhost:3001/tipos'
  private url = `${API_URL}/tipos`;

  /**
   * Obtiene el listado completo de tipos de casco disponibles.
   * @returns Observable que emite un arreglo de objetos `Tipo`.
   */
  getAll() { return this.http.get<Tipo[]>(this.url); }

  /**
   * Registra un nuevo tipo de casco en el sistema.
   * @param dto Objeto con los campos `nombre` y `descripcion` del nuevo tipo.
   *            El campo `id_tipo` es generado por el backend.
   * @returns Observable que emite el objeto `Tipo` creado.
   */
  create(dto: Partial<Tipo>) { return this.http.post<Tipo>(this.url, dto); }

  /**
   * Modifica parcialmente un tipo de casco existente (HTTP PATCH).
   * Solo los campos presentes en `dto` serán actualizados en la base de datos.
   * @param id  UUID del tipo a modificar.
   * @param dto Campos a actualizar (nombre y/o descripcion).
   * @returns Observable que emite el objeto `Tipo` con los datos actualizados.
   */
  update(id: string, dto: Partial<Tipo>) { return this.http.patch<Tipo>(`${this.url}/${id}`, dto); }

  /**
   * Elimina permanentemente un tipo de casco del sistema.
   * Si existen cascos que referencian este tipo, el backend rechazará
   * la operación con error 400 (violación de clave foránea).
   * @param id UUID del tipo a eliminar.
   * @returns Observable que completa sin emitir datos al finalizar.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
