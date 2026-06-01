/**
 * URL base del servidor backend (API REST de NestJS).
 *
 * Todos los servicios HTTP de la aplicación construyen sus endpoints
 * concatenando esta constante con el segmento de recurso correspondiente
 * (p.ej., `${API_URL}/cascos`, `${API_URL}/ventas`).
 *
 * En desarrollo apunta al puerto 3001 del servidor local.
 * Para producción, este valor debe reemplazarse (o leerse desde
 * variables de entorno de Angular via `environment.ts`) con la URL del servidor real.
 */
export const API_URL = 'http://localhost:3001';
