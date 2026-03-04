/**
 * Configuración de la API
 * Usa el base path del build para las llamadas a la API
 */

// Obtener el base path desde import.meta.env.BASE_URL (configurado por Vite)
// En desarrollo, BASE_URL será '/' y el proxy de Vite manejará '/api'
// En producción, BASE_URL será '/Empleado/' y las llamadas serán '/Empleado/api'
const basePath = import.meta.env.BASE_URL || (import.meta.env.DEV ? '/' : '/Empleado/');

// Construir la URL base de la API
export const API_BASE_URL = `${basePath}api`;
