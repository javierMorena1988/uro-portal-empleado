/**
 * Configuración de la API
 * Usa el base path del build para las llamadas a la API
 */

// Obtener el base path desde import.meta.env.BASE_URL (configurado por Vite)
// En producción con BASE_PATH=/Empleado/, será '/Empleado/'
// En desarrollo, será '/PortalEmpleado/'
const basePath = import.meta.env.BASE_URL || '/Empleado/';

// Construir la URL base de la API
export const API_BASE_URL = `${basePath}api`;
