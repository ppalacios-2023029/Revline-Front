// Injectable habilita a Angular para gestionar este servicio mediante su inyector.
// inject permite obtener dependencias de forma funcional, sin constructor explícito.
import { Injectable, inject } from '@angular/core';

// HttpClient se usa para realizar peticiones HTTP al backend REST.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio que describe el registro de inventario (stock) de un casco.
import { Inventario } from '../models';

// URL raíz del backend NestJS.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Inventario.
 *
 * Se comunica con el endpoint `/inventario` del backend para gestionar
 * el stock disponible de cada casco. Las reglas de negocio clave son:
 * - Cada casco tiene exactamente un registro de inventario (relación 1:1).
 * - El backend impide crear un inventario duplicado para el mismo casco.
 * - Al registrar una venta, el backend descuenta automáticamente `cantidad`
 *   del inventario del casco vendido.
 *
 * Con `providedIn: 'root'` el servicio es un singleton global compartido.
 */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  // Instancia de HttpClient inyectada funcionalmente para las peticiones HTTP.
  private http = inject(HttpClient);

  // URL del endpoint de inventario.
  // Ejemplo: 'http://localhost:3001/inventario'
  private url = `${API_URL}/inventario`;

  /**
   * Obtiene todos los registros de inventario del sistema.
   * Cada registro incluye el casco asociado con sus relaciones cargadas (eager).
   * @returns Observable que emite un arreglo de objetos `Inventario`.
   */
  getAll() { return this.http.get<Inventario[]>(this.url); }

  /**
   * Crea un nuevo registro de inventario para un casco.
   * El `dto` debe incluir el `id_casco` del casco al que se vincula el stock,
   * la `cantidad` inicial disponible y el estado `activo`.
   * El backend valida que el casco exista y que no tenga ya un inventario.
   * @param dto Objeto con los campos requeridos para crear el inventario.
   * @returns Observable que emite el objeto `Inventario` recién creado.
   */
  create(dto: object) { return this.http.post<Inventario>(this.url, dto); }

  /**
   * Actualiza parcialmente un registro de inventario (HTTP PATCH).
   * Se usa, por ejemplo, para ajustar manualmente el stock (`cantidad`)
   * o para activar/desactivar la disponibilidad del casco (`activo`).
   * @param id  UUID del registro de inventario a modificar.
   * @param dto Campos a actualizar (cantidad, activo, etc.).
   * @returns Observable que emite el objeto `Inventario` actualizado.
   */
  update(id: string, dto: object) { return this.http.patch<Inventario>(`${this.url}/${id}`, dto); }

  /**
   * Elimina un registro de inventario del sistema.
   * Esto desvincula el seguimiento de stock para el casco correspondiente.
   * @param id UUID del registro de inventario a eliminar.
   * @returns Observable que completa sin emitir valor al finalizar.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
