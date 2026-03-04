import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Base path: en desarrollo usar '/' para que el proxy funcione, en producción '/Empleado/'
const basePath = process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/Empleado/' : '/');

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
    },
  },
})
