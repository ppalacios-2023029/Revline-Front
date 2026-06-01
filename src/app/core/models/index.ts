/**
 * Modelos de dominio de la aplicación Revline.
 *
 * Cada interfaz refleja exactamente la estructura de los objetos
 * que devuelve el backend NestJS. Usarlos como genéricos en HttpClient
 * (p.ej., `http.get<Casco[]>(url)`) permite tipado estático en toda la app.
 */

/**
 * Representa una marca de casco (p.ej., Shoei, HJC, Arai).
 * Corresponde a la entidad `Marca` del backend.
 */
export interface Marca {
  /** Identificador único de la marca (UUID generado por el backend). */
  id_marca: string;
  /** Nombre comercial de la marca. */
  nombre: string;
  /** Texto descriptivo de la marca (historia, país de origen, etc.). */
  descripcion: string;
}

/**
 * Representa una medida o talla de casco (p.ej., S, M, L, XL).
 * Corresponde a la entidad `Medida` del backend.
 */
export interface Medida {
  /** Identificador único de la medida (UUID). */
  id_medida: string;
  /** Valor de la talla, puede ser numérico o alfanumérico (p.ej., "57-58", "L"). */
  talla: string;
}

/**
 * Representa un tipo de casco según su diseño o uso
 * (p.ej., integral, modular, off-road, abierto).
 * Corresponde a la entidad `Tipo` del backend.
 */
export interface Tipo {
  /** Identificador único del tipo de casco (UUID). */
  id_tipo: string;
  /** Nombre del tipo (p.ej., "Integral", "Modular"). */
  nombre: string;
  /** Descripción detallada del tipo de casco y sus características. */
  descripcion: string;
}

/**
 * Representa un certificado de seguridad homologado
 * (p.ej., DOT, ECE 22.06, SNELL).
 * Corresponde a la entidad `Certificado` del backend.
 */
export interface Certificado {
  /** Identificador único del certificado (UUID). */
  id_certificado: string;
  /** Nombre o código del certificado (p.ej., "DOT", "ECE 22.06"). */
  tipo: string;
  /** Descripción del estándar de seguridad que representa el certificado. */
  descripcion: string;
}

/**
 * Representa un casco del catálogo de productos.
 * Es la entidad central del sistema; se relaciona con Marca, Medida, Tipo y Certificado.
 * Todas las relaciones se cargan de forma eager en el backend, por lo que
 * siempre llegan como objetos anidados, nunca como IDs planos.
 * Corresponde a la entidad `Casco` del backend.
 */
export interface Casco {
  /** Identificador único del casco (UUID). */
  id_casco: string;
  /** Nombre del modelo del casco (p.ej., "RF-1400"). */
  nombre: string;
  /** Precio de venta unitario en la moneda local. */
  precio: number;
  /** Descripción del casco: materiales, características, uso recomendado, etc. */
  descripcion: string;
  /**
   * Lista de rutas o nombres de archivos de imágenes asociadas al casco.
   * Se almacenan en el backend y se usan para renderizar la galería de fotos.
   */
  files: string[];
  /** Marca del casco, cargada con todos sus campos (eager). */
  marca: Marca;
  /** Medida o talla principal del casco, cargada con todos sus campos (eager). */
  medida: Medida;
  /** Tipo de casco (integral, modular, etc.), cargado con todos sus campos (eager). */
  tipo: Tipo;
  /** Certificado de seguridad del casco, cargado con todos sus campos (eager). */
  certificado: Certificado;
  /**
   * Lista de tallas disponibles para este modelo de casco.
   * Campo opcional utilizado en la vista de catálogo para mostrar variantes de talla.
   */
  tallas?: string[];
  /**
   * Lista de variantes de este casco agrupadas por talla.
   * Cada elemento contiene el id del casco variante y la talla correspondiente,
   * útil para navegar entre tallas del mismo modelo en el catálogo.
   */
  variantes?: { id_casco: string; talla: string }[];
}

/**
 * Representa el registro de inventario (stock) de un casco.
 * Tiene una relación uno a uno con `Casco`: cada casco tiene exactamente un inventario.
 * Corresponde a la entidad `Inventario` del backend.
 */
export interface Inventario {
  /** Identificador único del registro de inventario (UUID). */
  id_inventario: string;
  /** Cantidad de unidades disponibles en stock para este casco. */
  cantidad: number;
  /** Indica si el casco está activo / disponible para la venta. */
  activo: boolean;
  /** Casco al que pertenece este registro de inventario (cargado con eager loading). */
  casco: Casco;
}

/**
 * Tipo que representa los posibles estados de una venta.
 * - `'pendiente'`   → La venta fue registrada pero aún no se completó ni canceló.
 * - `'completada'`  → La venta fue procesada y entregada correctamente.
 * - `'cancelada'`   → La venta fue anulada antes de completarse.
 */
export type EstadoVenta = 'pendiente' | 'completada' | 'cancelada';

/**
 * Representa una transacción de venta de un casco.
 * Al crear una venta, el backend descuenta automáticamente la cantidad
 * del inventario del casco correspondiente.
 * Corresponde a la entidad `Venta` del backend.
 */
export interface Venta {
  /** Identificador único de la venta (UUID). */
  id_venta: string;
  /** Número de unidades vendidas en esta transacción. */
  cantidad: number;
  /** Estado actual de la venta: 'pendiente', 'completada' o 'cancelada'. */
  estado: EstadoVenta;
  /** Fecha y hora en que se registró la venta (ISO 8601 como string). */
  fecha_venta: string;
  /**
   * Fecha y hora de entrega del pedido (ISO 8601 como string).
   * Es `null` si todavía no se ha registrado una fecha de entrega.
   */
  fecha_entrega: string | null;
  /** Casco vendido, cargado con todos sus datos mediante eager loading. */
  casco: Casco;
}
