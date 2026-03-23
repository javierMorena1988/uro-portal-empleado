/**
 * Script temporal para resetear la contraseña de un usuario
 * Uso: node server/scripts/reset-password.js <username> [newPassword]
 * 
 * Si no se proporciona newPassword, se genera una automáticamente
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const MOCK_USERS_FILE = join(__dirname, '../../data/mockUsers.json');
const DATA_DIR = dirname(MOCK_USERS_FILE);

// Función para generar contraseña segura
function generatePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  // Asegurar al menos una mayúscula, una minúscula, un número y un símbolo
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  // Completar hasta 12 caracteres
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function resetPassword(username, newPassword = null) {
  try {
    // Crear directorio si no existe
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Leer usuarios existentes
    let users = {};
    try {
      const data = await fs.readFile(MOCK_USERS_FILE, 'utf-8');
      users = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      console.log('📁 Archivo de usuarios no existe, se creará uno nuevo');
    }

    // Verificar si el usuario existe
    if (!users[username]) {
      console.error(`❌ Error: El usuario "${username}" no existe en el sistema.`);
      console.log('\nUsuarios existentes:');
      Object.keys(users).forEach(u => {
        console.log(`  - ${u} (${users[u].email || 'sin email'})`);
      });
      process.exit(1);
    }

    // Generar contraseña si no se proporciona
    const password = newPassword || generatePassword();

    // Actualizar contraseña
    users[username].password = password;

    // Guardar cambios
    await fs.writeFile(MOCK_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    console.log('\n✅ Contraseña reseteada exitosamente!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`👤 Usuario: ${username}`);
    console.log(`📧 Email: ${users[username].email || 'N/A'}`);
    console.log(`🔑 Nueva contraseña: ${password}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANTE: Guarda esta contraseña de forma segura.');
    console.log('   El usuario puede ahora hacer login con esta contraseña.\n');

  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error.message);
    process.exit(1);
  }
}

// Ejecutar script
const username = process.argv[2];
const newPassword = process.argv[3] || null;

if (!username) {
  console.error('❌ Error: Debes proporcionar un nombre de usuario');
  console.log('\nUso: node server/scripts/reset-password.js <username> [newPassword]');
  console.log('\nEjemplos:');
  console.log('  node server/scripts/reset-password.js javier.morena');
  console.log('  node server/scripts/reset-password.js javier.morena MiNuevaPass123!');
  process.exit(1);
}

resetPassword(username, newPassword);
