// Injectable registra la clase en el sistema de inyección de dependencias de Angular.
// inject es la función funcional para inyectar dependencias sin usar el constructor.
import { Injectable, inject } from '@angular/core';

// HttpClient proporciona los métodos para realizar peticiones HTTP tipadas.
import { HttpClient } from '@angular/common/http';

// Interfaz de dominio que representa una medida/talla de casco.
import { Medida } from '../models';

// URL base del servidor backend NestJS.
import { API_URL } from '../api';

/**
 * Servicio de acceso a datos para la entidad Medida.
 *
 * Gestiona las operaciones CRUD contra el endpoint `/medidas` del backend.
 * Las medidas representan las tallas disponibles para los cascos
 * (p.ej., S, M, L, XL o rangos en centímetros como "57-58").
 *
 * Al estar registrado con `providedIn: 'root'`, Angular crea una única instancia
 * de este servicio que se comparte entre todos los componentes que lo inyecten.
 */
@Injectable({ providedIn: 'root' })
export class MedidasService {
  // Instancia de HttpClient inyectada funcionalmente.
  // Se usa para enviar y recibir datos del backend.
  private http = inject(HttpClient);

  // URL completa del endpoint de medidas.
  // Ejemplo: 'http://localhost:3001/medidas'
  private url = `${API_URL}/medidas`;

  /**
   * Recupera todas las medidas/tallas registradas en el sistema.
   * @returns Observable que emite un arreglo de objetos `Medida`.
   */
  getAll() { return this.http.get<Medida[]>(this.url); }

  /**
   * Crea una nueva medida/talla en el sistema.
   * @param dto Objeto con el campo `talla` requerido para crear la medida.
   *            El ID lo asigna automáticamente el backend (UUID).
   * @returns Observable que emite el objeto `Medida` creado por el backend.
   */
  create(dto: Partial<Medida>) { return this.http.post<Medida>(this.url, dto); }

  /**
   * Actualiza parcialmente una medida existente mediante HTTP PATCH.
   * Permite modificar únicamente el campo `talla` sin reenviar todos los datos.
   * @param id  UUID de la medida a modificar.
   * @param dto Objeto con los campos a actualizar.
   * @returns Observable que emite el objeto `Medida` con los datos actualizados.
   */
  update(id: string, dto: Partial<Medida>) { return this.http.patch<Medida>(`${this.url}/${id}`, dto); }

  /**
   * Elimina definitivamente una medida del sistema.
   * Si algún casco referencia esta medida, el backend retornará 400
   * debido a la restricción de clave foránea (FK constraint).
   * @param id UUID de la medida a eliminar.
   * @returns Observable que completa sin emitir valor al terminar la operación.
   */
  remove(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
}
