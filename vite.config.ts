import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Base path: '/PortalEmpleado/' para desarrollo, '/' para producción
// En producción (vite build), usa '/' por defecto
// Puedes sobrescribirlo con: BASE_PATH=/PortalEmpleado/ npm run build
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('build');
const basePath = process.env.BASE_PATH || (isProduction ? '/' : '/PortalEmpleado/');

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        secure: false,
      },
      // También proxy para /PortalEmpleado/api en desarrollo
      '/PortalEmpleado/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/PortalEmpleado/, ''),
      },
    },
  },
})
