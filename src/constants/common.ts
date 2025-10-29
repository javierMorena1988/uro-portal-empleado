// Constantes generales de la aplicación
export const APP_CONFIG = {
  NAME: 'Portal Empleado UROVESA',
  VERSION: '1.0.0',
  COMPANY: 'UROVESA',
} as const;

export const COLORS = {
  PRIMARY: '#004186',
  SECONDARY: '#718096',
  SUCCESS: '#155724',
  WARNING: '#856404',
  ERROR: '#721c24',
  INFO: '#004186',
} as const;

export const SIZES = {
  HEADER_HEIGHT: '64px',
  SIDEBAR_WIDTH: '280px',
  BORDER_RADIUS: '8px',
  BORDER_RADIUS_SMALL: '6px',
  BORDER_RADIUS_LARGE: '12px',
} as const;

export const BREAKPOINTS = {
  MOBILE: '768px',
  TABLET: '1024px',
  DESKTOP: '1024px',
} as const;
