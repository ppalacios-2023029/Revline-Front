// Injectable registra esta clase como servicio en el sistema DI de Angular.
// inject es la API funcional para inyectar dependencias sin declarar constructor.
import { Injectable, inject } from '@angular/core';

// HttpClient permite hacer peticiones HTTP tipadas al backend REST.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio que modela una transacción de venta en el sistema.
import { Venta } from '../models';

// URL base del servidor backend NestJS.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Venta.
 *
 * Gestiona las operaciones CRUD contra el endpoint `/ventas` del backend.
 * Las ventas son el flujo de negocio principal de Revline:
 * - Al crear una venta, el backend valida que haya stock suficiente
 *   y descuenta automáticamente la `cantidad` del inventario del casco.
 * - El estado de la venta (`pendiente`, `completada`, `cancelada`) se
 *   puede actualizar mediante PATCH sin necesidad de reenviar todos los campos.
 * - La fecha de entrega es nullable: se asigna cuando se completa el pedido.
 *
 * `providedIn: 'root'` garantiza que solo exista una instancia del servicio
 * durante todo el ciclo de vida de la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class VentasService {
  // HttpClient inyectado funcionalmente para las peticiones HTTP.
  private http = inject(HttpClient);

  // URL completa del endpoint de ventas.
  // Ejemplo: 'http://localhost:3001/ventas'
  private url = `${API_URL}/ventas`;

  /**
   * Obtiene todas las ventas registradas en el sistema.
   * Cada venta incluye el casco vendido con todas sus relaciones cargadas (eager).
   * @returns Observable que emite un arreglo de objetos `Venta`.
   */
  getAll() { return this.http.get<Venta[]>(this.url); }

  /**
   * Registra una nueva venta en el sistema.
   * El `dto` debe incluir como mínimo `id_casco` y `cantidad`.
   * El backend verifica el stock disponible antes de persistir la venta
   * y decrementa el inventario del casco en la misma transacción.
   * Si el stock es insuficiente, el backend devuelve un error HTTP.
   * @param dto Objeto con los datos requeridos para crear la venta.
   * @returns Observable que emite el objeto `Venta` recién creado por el backend.
   */
  create(dto: object) { return this.http.post<Venta>(this.url, dto); }

  /**
   * Actualiza parcialmente una venta existente (HTTP PATCH).
   * Uso habitual: cambiar el `estado` de la venta (p.ej., de 'pendiente' a 'completada')
   * o registrar la `fecha_entrega` cuando el pedido es despachado.
   * Solo los campos incluidos en `dto` son modificados en el backend.
   * @param id  UUID de la venta a actualizar.
   * @param dto Campos a modificar (estado, fecha_entrega, cantidad, etc.).
   * @returns Observable que emite el objeto `Venta` con los datos actualizados.
   */
  update(id: string, dto: object) { return this.http.patch<Venta>(`${this.url}/${id}`, dto); }

  /**
   * Elimina un registro de venta del sistema de forma permanente.
   * Nota: eliminar una venta NO restaura automáticamente el inventario del casco;
   * ese ajuste debe realizarse manualmente si es necesario.
   * @param id UUID de la venta a eliminar.
   * @returns Observable que completa sin emitir ningún valor al terminar.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
