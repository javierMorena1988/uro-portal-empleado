/**
 * Elimina un usuario del modo MOCK (mockUsers.json y twoFactorSecrets.json).
 * Uso: node server/scripts/delete-user.js <username>
 * Ejemplo: node server/scripts/delete-user.js javier.morena
 *
 * Después de borrarlo, el usuario puede volver a registrarse y recibir el correo.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MOCK_USERS_FILE = join(__dirname, '../../data/mockUsers.json');
const TWO_FACTOR_FILE = join(__dirname, '../../data/twoFactorSecrets.json');

async function deleteUser(username) {
  const normalized = String(username).trim().toLowerCase();
  if (!normalized) {
    console.error('Uso: node server/scripts/delete-user.js <username>');
    console.error('Ejemplo: node server/scripts/delete-user.js javier.morena');
    process.exit(1);
  }

  let deletedFromMock = false;
  let deletedFrom2FA = false;

  try {
    const data = await fs.readFile(MOCK_USERS_FILE, 'utf-8');
    const users = JSON.parse(data);
    if (Object.prototype.hasOwnProperty.call(users, normalized)) {
      delete users[normalized];
      await fs.writeFile(MOCK_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
      deletedFromMock = true;
      console.log(`[OK] Usuario "${normalized}" eliminado de data/mockUsers.json`);
    } else {
      console.log(`[--] Usuario "${normalized}" no estaba en mockUsers.json`);
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('[--] Archivo mockUsers.json no encontrado');
    } else {
      console.error('Error en mockUsers.json:', e.message);
      process.exit(1);
    }
  }

  try {
    const data = await fs.readFile(TWO_FACTOR_FILE, 'utf-8');
    const secrets = JSON.parse(data);
    if (Object.prototype.hasOwnProperty.call(secrets, normalized)) {
      delete secrets[normalized];
      await fs.writeFile(TWO_FACTOR_FILE, JSON.stringify(secrets, null, 2), 'utf-8');
      deletedFrom2FA = true;
      console.log(`[OK] Usuario "${normalized}" eliminado de data/twoFactorSecrets.json`);
    } else {
      console.log(`[--] Usuario "${normalized}" no estaba en twoFactorSecrets.json`);
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('[--] Archivo twoFactorSecrets.json no encontrado (se ignora)');
    } else {
      console.error('Error en twoFactorSecrets.json:', e.message);
      process.exit(1);
    }
  }

  if (deletedFromMock || deletedFrom2FA) {
    console.log('\nListo. El usuario puede volver a registrarse y recibir el correo.');
  } else {
    console.log('\nNo se eliminó nada. Comprueba el nombre de usuario (ej: javier.morena).');
  }
}

const username = process.argv[2];
deleteUser(username);
