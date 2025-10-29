// Mensajes y textos de la aplicación
export const MESSAGES = {
  LOGIN: {
    TITLE: 'Iniciar sesión',
    SUBTITLE: 'Accede a tu portal de empleado',
    EMAIL_PLACEHOLDER: 'Correo electrónico',
    PASSWORD_PLACEHOLDER: 'Contraseña',
    SUBMIT_BUTTON: 'Iniciar sesión',
    ERROR_INVALID_CREDENTIALS: 'Credenciales inválidas',
    ERROR_REQUIRED_FIELD: 'Este campo es obligatorio',
  },
  
  DASHBOARD: {
    WELCOME: 'Bienvenido',
    QUICK_ACCESS: 'Acceso rápido',
    PERSONAL_DATA: 'Datos personales',
    RECENT_PAYROLLS: 'Nóminas recientes',
    VIEW_ALL_PAYROLLS: 'Ver todas las nóminas',
    HELP_TITLE: '¿Necesitas ayuda?',
    HELP_TEXT: 'Si tienes alguna duda o problema, no dudes en contactarnos.',
    CONTACT_BUTTON: 'Contactar',
  },
  
  DOCUMENTS: {
    PUBLIC: {
      TITLE: 'Documentos públicos',
      SUBTITLE: 'Políticas y recursos de la empresa',
      FILTER_ALL: 'Todos',
      NO_DOCUMENTS: 'No hay documentos públicos disponibles',
      HELP_TITLE: '¿No encuentras lo que buscas?',
    },
    PRIVATE: {
      TITLE: 'Documentos privados',
      SUBTITLE: 'Documentos personales y confidenciales',
      PROTECTED_TITLE: 'Documentos protegidos',
      PROTECTED_TEXT: 'Estos documentos requieren autenticación adicional para su visualización.',
      REQUEST_TITLE: 'Solicitar acceso',
      REQUEST_TEXT: 'Contacta con el departamento de Recursos Humanos para solicitar acceso a otros documentos.',
      REQUEST_BUTTON: 'Solicitar acceso',
      NO_DOCUMENTS: 'No hay documentos privados disponibles',
    },
  },
  
  PAYROLL: {
    TITLE: 'Nóminas',
    SUBTITLE: 'Consulta tus nóminas y recibos de salario',
    VIEW_BUTTON: 'Ver',
    DOWNLOAD_BUTTON: 'Descargar',
    NO_PAYROLLS: 'No hay nóminas disponibles',
  },
  
  ERRORS: {
    GENERIC: 'Ha ocurrido un error inesperado',
    NETWORK: 'Error de conexión',
    UNAUTHORIZED: 'No tienes permisos para acceder a este contenido',
    NOT_FOUND: 'Contenido no encontrado',
  },
  
  SUCCESS: {
    LOGIN: 'Sesión iniciada correctamente',
    LOGOUT: 'Sesión cerrada correctamente',
    DOWNLOAD_STARTED: 'Descarga iniciada',
  },
} as const;
