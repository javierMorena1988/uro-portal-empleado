// Constantes de navegación y menús
export const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Inicio',
    icon: 'home',
  },
  {
    id: 'payroll',
    label: 'Nóminas',
    icon: 'payroll',
  },
  {
    id: 'public-docs',
    label: 'Documentos públicos',
    icon: 'public-docs',
  },
  {
    id: 'private-docs',
    label: 'Documentos privados',
    icon: 'private-docs',
  },
] as const;

export const QUICK_ACCESS_ITEMS = [
  {
    id: 'payroll',
    title: 'Nóminas',
    description: 'Consulta tus nóminas',
    icon: 'payroll',
  },
  {
    id: 'public-docs',
    title: 'Documentos públicos',
    description: 'Políticas y recursos',
    icon: 'public-docs',
  },
  {
    id: 'private-docs',
    title: 'Documentos privados',
    description: 'Documentos personales',
    icon: 'private-docs',
  },
] as const;

export const USER_INFO = {
  NAME: 'Beatriz Rodríguez Donsión',
  ROLE: 'Empleado',
} as const;
