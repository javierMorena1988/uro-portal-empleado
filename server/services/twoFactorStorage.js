/**
 * Almacenamiento persistente de secretos 2FA
 * 
 * Los datos se guardan en un archivo JSON para persistir entre reinicios del servidor
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo de almacenamiento
const STORAGE_FILE = path.join(__dirname, '../../data/twoFactorSecrets.json');
const STORAGE_DIR = path.dirname(STORAGE_FILE);

// Almacenamiento en memoria (caché)
const userSecrets = new Map();

/**
 * Carga los datos desde el archivo de almacenamiento
 */
async function loadFromFile() {
  try {
    // Crear directorio si no existe
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    // Intentar leer el archivo
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    const secrets = JSON.parse(data);
    
    // Cargar al Map en memoria
    userSecrets.clear();
    for (const [username, userData] of Object.entries(secrets)) {
      userSecrets.set(username, userData);
    }
    
    // eslint-disable-next-line no-console
    console.log(`[2FA Storage] Cargados ${userSecrets.size} secretos desde archivo`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Archivo no existe aún, es normal en el primer inicio
      // eslint-disable-next-line no-console
      console.log('[2FA Storage] Archivo de almacenamiento no existe, se creará cuando se guarde el primer secreto');
    } else {
      // eslint-disable-next-line no-console
      console.error('[2FA Storage] Error al cargar desde archivo:', error.message);
    }
  }
}

/**
 * Guarda los datos al archivo de almacenamiento
 */
async function saveToFile() {
  try {
    // Crear directorio si no existe
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    // Convertir Map a objeto
    const secrets = {};
    for (const [username, userData] of userSecrets.entries()) {
      secrets[username] = userData;
    }
    
    // Guardar al archivo
    await fs.writeFile(STORAGE_FILE, JSON.stringify(secrets, null, 2), 'utf-8');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[2FA Storage] Error al guardar en archivo:', error.message);
  }
}

/**
 * Guarda el secreto 2FA de un usuario
 * @param {string} username - Nombre de usuario
 * @param {string} secret - Secreto base32
 */
export async function saveSecret(username, secret) {
  userSecrets.set(username, {
    secret,
    enabled: false, // Se habilita después de verificar el primer código
    createdAt: new Date().toISOString(),
  });
  await saveToFile();
}

/**
 * Obtiene el secreto 2FA de un usuario
 * @param {string} username - Nombre de usuario
 * @returns {Object|null} Objeto con el secreto o null si no existe
 */
export function getSecret(username) {
  return userSecrets.get(username) || null;
}

/**
 * Verifica si un usuario tiene 2FA habilitado
 * @param {string} username - Nombre de usuario
 * @returns {boolean}
 */
export function is2FAEnabled(username) {
  const userData = userSecrets.get(username);
  return userData?.enabled === true;
}

/**
 * Habilita 2FA para un usuario (después de verificar el primer código)
 * @param {string} username - Nombre de usuario
 */
export async function enable2FA(username) {
  const userData = userSecrets.get(username);
  if (userData) {
    userData.enabled = true;
    userSecrets.set(username, userData);
    await saveToFile();
  }
}

/**
 * Deshabilita 2FA para un usuario
 * @param {string} username - Nombre de usuario
 */
export async function disable2FA(username) {
  userSecrets.delete(username);
  await saveToFile();
}

/**
 * Obtiene todos los usuarios con 2FA (útil para debugging)
 * @returns {Array} Lista de usuarios
 */
export function getAllUsers() {
  return Array.from(userSecrets.entries()).map(([username, data]) => ({
    username,
    enabled: data.enabled,
    createdAt: data.createdAt,
  }));
}

// Cargar datos al iniciar el módulo
loadFromFile().catch(error => {
  // eslint-disable-next-line no-console
  console.error('[2FA Storage] Error al inicializar:', error.message);
});








