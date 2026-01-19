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

// Decodificar el Base64 del header Authorization
const authHeader = 'VVJPXHRoZXJlZm9yZXFzOkRTVDk4MSQkODlPT2Q=';
const decoded = Buffer.from(authHeader, 'base64').toString('utf-8');
const [username, password] = decoded.split(':');

console.log('🔐 Credenciales decodificadas del header Authorization:');
console.log(`   Usuario: ${username}`);
console.log(`   Contraseña: ${password.replace(/./g, '*')}`); // Ocultar contraseña

// Actualizar o agregar las credenciales
// Usar regex más específico para evitar problemas con caracteres especiales
const usernameRegex = /^THEREFORE_USERNAME=.*$/m;
const passwordRegex = /^THEREFORE_PASSWORD=.*$/m;

// Escapar caracteres especiales para el .env
// En .env, el $ necesita ser escapado como $$ si queremos un $ literal
const escapeForEnv = (str) => {
  // No necesitamos escapar, solo guardar tal cual
  return str;
};

if (usernameRegex.test(envContent)) {
  envContent = envContent.replace(usernameRegex, `THEREFORE_USERNAME=${escapeForEnv(username)}`);
} else {
  // Agregar si no existe
  if (!envContent.endsWith('\n') && envContent.length > 0) {
    envContent += '\n';
  }
  envContent += `THEREFORE_USERNAME=${escapeForEnv(username)}\n`;
}

if (passwordRegex.test(envContent)) {
  // Para la contraseña, necesitamos reemplazar todos los $ con $$ para que se guarde correctamente
  const escapedPassword = password.replace(/\$/g, '$$$$'); // En .env, $$ se interpreta como un $ literal
  envContent = envContent.replace(passwordRegex, `THEREFORE_PASSWORD=${escapedPassword}`);
} else {
  // Agregar si no existe
  if (!envContent.endsWith('\n') && envContent.length > 0) {
    envContent += '\n';
  }
  const escapedPassword = password.replace(/\$/g, '$$$$');
  envContent += `THEREFORE_PASSWORD=${escapedPassword}\n`;
}

writeFileSync(envPath, envContent, 'utf-8');
console.log('\n✅ Archivo .env actualizado con las credenciales de Therefore');

// Verificar que se guardó correctamente
const verifyContent = readFileSync(envPath, 'utf-8');
const verifyUser = verifyContent.match(/THEREFORE_USERNAME=(.+)/)?.[1];
const verifyPass = verifyContent.match(/THEREFORE_PASSWORD=(.+)/)?.[1];

if (verifyUser && verifyPass) {
  const verifyBasic = Buffer.from(`${verifyUser}:${verifyPass}`).toString('base64');
  const matches = verifyBasic === authHeader;
  console.log(`✅ Verificación: Basic Auth ${matches ? 'coincide' : 'NO coincide'} con el header proporcionado`);
  if (!matches) {
    console.log(`   Generado: Basic ${verifyBasic}`);
    console.log(`   Esperado: Basic ${authHeader}`);
  }
}

console.log('⚠️  IMPORTANTE: Reinicia el servidor para que los cambios surtan efecto');
