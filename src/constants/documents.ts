// Constantes relacionadas con documentos
export const DOCUMENT_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export const DOCUMENT_CATEGORIES = {
  POLITICAS: 'Políticas',
  RECURSOS: 'Recursos',
} as const;

export const DOCUMENT_STATUS = {
  FIRMADO: 'Firmado',
  DISPONIBLE: 'Disponible',
} as const;

export const DOCUMENT_ACTIONS = {
  VIEW: 'Ver',
  DOWNLOAD: 'Descargar',
} as const;

export const DOCUMENT_MESSAGES = {
  PROTECTED_SECTION_TITLE: 'Documentos protegidos',
  PROTECTED_SECTION_TEXT: 'Estos documentos requieren autenticación adicional para su visualización.',
  REQUEST_SECTION_TITLE: 'Solicitar acceso',
  REQUEST_SECTION_TEXT: 'Contacta con el departamento de Recursos Humanos para solicitar acceso a otros documentos.',
  REQUEST_BUTTON: 'Solicitar acceso',
  NO_DOCUMENTS: 'No hay documentos disponibles',
  LOADING: 'Cargando documentos...',
} as const;
