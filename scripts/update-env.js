import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (!existsSync(envPath)) {
  console.error('❌ El archivo .env no existe');
  process.exit(1);
}

let envContent = readFileSync(envPath, 'utf-8');

// Verificar si ya tiene THEREFORE_BASE_URL configurado
if (envContent.includes('THEREFORE_BASE_URL=')) {
  // Actualizar la URL si existe
  envContent = envContent.replace(
    /THEREFORE_BASE_URL=.*/g,
    'THEREFORE_BASE_URL=https://therefore.urovesa.com:443/theservice/v0001/restun'
  );
} else {
  // Agregar la sección completa al final
  const thereforeSection = `

# ==================== CONFIGURACIÓN THEREFORE ====================
THEREFORE_BASE_URL=https://therefore.urovesa.com:443/theservice/v0001/restun
THEREFORE_USERNAME=tu_usuario_therefore
THEREFORE_PASSWORD=tu_contraseña_therefore
THEREFORE_TENANT=nombre_tenant
`;
  envContent += thereforeSection;
}

writeFileSync(envPath, envContent, 'utf-8');
console.log('✅ Archivo .env actualizado');
console.log('📝 URL base de Therefore configurada: https://therefore.urovesa.com:443/theservice/v0001/restun');
console.log('⚠️  IMPORTANTE: Debes configurar THEREFORE_USERNAME y THEREFORE_PASSWORD con tus credenciales reales');
