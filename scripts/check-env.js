import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde la raíz del proyecto
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('🔍 Verificando configuración del archivo .env...\n');

// Verificar si el archivo existe
if (!existsSync(envPath)) {
  console.log('❌ El archivo .env NO existe en la raíz del proyecto');
  console.log('📝 Crea el archivo .env copiando env.example.txt\n');
  process.exit(1);
}

console.log('✅ El archivo .env existe\n');

// Variables requeridas para Therefore
const requiredVars = {
  THEREFORE_BASE_URL: 'URL base de Therefore (ej: https://therefore.urovesa.com:443/theservice/v0001/restun)',
  THEREFORE_USERNAME: 'Usuario de Therefore',
  THEREFORE_PASSWORD: 'Contraseña de Therefore',
};

// Variables opcionales
const optionalVars = {
  THEREFORE_TENANT: 'Tenant de Therefore (opcional)',
};

console.log('📋 Variables de Therefore:\n');

let allConfigured = true;

// Verificar variables requeridas
for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  if (value && value.trim() !== '' && !value.includes('tu-') && !value.includes('tu_')) {
    console.log(`  ✅ ${varName}: Configurado`);
    // Mostrar solo los primeros caracteres por seguridad
    if (varName.includes('PASSWORD')) {
      console.log(`     Valor: ${'*'.repeat(Math.min(value.length, 10))}...`);
    } else {
      console.log(`     Valor: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    }
  } else {
    console.log(`  ❌ ${varName}: NO configurado`);
    console.log(`     ${description}`);
    allConfigured = false;
  }
}

// Verificar variables opcionales
console.log('\n📋 Variables opcionales:\n');
for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  if (value && value.trim() !== '' && !value.includes('nombre_tenant')) {
    console.log(`  ✅ ${varName}: Configurado`);
  } else {
    console.log(`  ⚠️  ${varName}: No configurado (opcional)`);
  }
}

console.log('\n' + '='.repeat(60) + '\n');

if (allConfigured) {
  console.log('✅ Todas las variables requeridas de Therefore están configuradas');
  console.log('✅ El servidor debería poder conectarse a Therefore\n');
} else {
  console.log('❌ Faltan variables de configuración de Therefore');
  console.log('\n📝 Para solucionarlo:');
  console.log('   1. Abre el archivo .env en la raíz del proyecto');
  console.log('   2. Configura las siguientes variables:');
  console.log('      THEREFORE_BASE_URL=https://therefore.urovesa.com:443/theservice/v0001/restun');
  console.log('      THEREFORE_USERNAME=tu_usuario_aqui');
  console.log('      THEREFORE_PASSWORD=tu_contraseña_aqui');
  console.log('   3. Reinicia el servidor después de guardar los cambios\n');
  process.exit(1);
}
