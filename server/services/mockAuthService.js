/**
 * Servicio de autenticación mock para desarrollo y pruebas
 * 
 * Este servicio simula la autenticación LDAP sin necesidad de un servidor real.
 * Útil para probar 2FA y otras funcionalidades sin configurar LDAP.
 * 
 * Para habilitar: establecer MOCK_AUTH=true en .env
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del archivo de almacenamiento
const STORAGE_FILE = path.join(__dirname, '../../data/mockUsers.json');
const STORAGE_DIR = path.dirname(STORAGE_FILE);

// Usuarios en memoria (caché)
const mockUsers = new Map();

// Usuarios por defecto (solo se usan si el archivo no existe)
const DEFAULT_USERS = [
  ['testuser', {
    username: 'testuser',
    password: 'password123',
    email: 'testuser@urovesa.com',
    displayName: 'Usuario de Prueba',
    dn: 'CN=testuser,CN=Users,DC=urovesa,DC=com',
  }],
  ['admin', {
    username: 'admin',
    password: 'admin123',
    email: 'admin@urovesa.com',
    displayName: 'Administrador',
    dn: 'CN=admin,CN=Users,DC=urovesa,DC=com',
  }],
  ['demo', {
    username: 'demo',
    password: 'demo123',
    email: 'demo@urovesa.com',
    displayName: 'Usuario Demo',
    dn: 'CN=demo,CN=Users,DC=urovesa,DC=com',
  }],
];

/**
 * Carga los usuarios desde el archivo de almacenamiento
 */
async function loadUsersFromFile() {
  try {
    // Crear directorio si no existe
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    // Intentar leer el archivo
    // eslint-disable-next-line no-console
    console.log(`[Mock Auth] Intentando cargar archivo: ${STORAGE_FILE}`);
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    const users = JSON.parse(data);
    
    // eslint-disable-next-line no-console
    console.log(`[Mock Auth] Archivo leído, usuarios encontrados:`, Object.keys(users));
    
    // Cargar al Map en memoria
    mockUsers.clear();
    for (const [username, userData] of Object.entries(users)) {
      mockUsers.set(username, userData);
      // eslint-disable-next-line no-console
      console.log(`[Mock Auth] Usuario cargado: ${username} (email: ${userData.email})`);
    }
    
    // eslint-disable-next-line no-console
    console.log(`[Mock Auth] Cargados ${mockUsers.size} usuarios desde archivo`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Archivo no existe aún, usar usuarios por defecto
      mockUsers.clear();
      for (const [username, userData] of DEFAULT_USERS) {
        mockUsers.set(username, userData);
      }
      // Guardar usuarios por defecto
      await saveUsersToFile();
      // eslint-disable-next-line no-console
      console.log('[Mock Auth] Archivo no existe, usando usuarios por defecto y guardándolos');
    } else {
      // eslint-disable-next-line no-console
      console.error('[Mock Auth] Error al cargar desde archivo:', error.message);
      // Usar usuarios por defecto en caso de error
      mockUsers.clear();
      for (const [username, userData] of DEFAULT_USERS) {
        mockUsers.set(username, userData);
      }
    }
  }
}

/**
 * Guarda los usuarios al archivo de almacenamiento
 */
async function saveUsersToFile() {
  try {
    // Crear directorio si no existe
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    
    // Convertir Map a objeto
    const users = {};
    for (const [username, userData] of mockUsers.entries()) {
      users[username] = userData;
    }
    
    // Guardar al archivo
    await fs.writeFile(STORAGE_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Mock Auth] Error al guardar en archivo:', error.message);
  }
}

// Cargar usuarios al iniciar el módulo
loadUsersFromFile();

/**
 * Autentica un usuario (mock)
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} Información del usuario autenticado
 */
export async function authenticateUser(username, password) {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 200));

  // Normalizar username a minúsculas
  const normalizedUsername = String(username).trim().toLowerCase();

  // Si el Map está vacío, intentar recargar el archivo
  if (mockUsers.size === 0) {
    // eslint-disable-next-line no-console
    console.log('[Mock Auth] Map vacío, recargando archivo...');
    await loadUsersFromFile();
  }

  // eslint-disable-next-line no-console
  console.log('[Mock Auth] Buscando usuario:', normalizedUsername, '(original:', username, ')');
  // eslint-disable-next-line no-console
  console.log('[Mock Auth] Usuarios disponibles:', Array.from(mockUsers.keys()));

  const user = mockUsers.get(normalizedUsername);

  if (!user) {
    // eslint-disable-next-line no-console
    console.log('[Mock Auth] Usuario no encontrado. Usuarios en Map:', Array.from(mockUsers.keys()));
    throw new Error('Usuario no encontrado en LDAP');
  }

  if (user.password !== password) {
    throw new Error('Credenciales inválidas');
  }

  return {
    username: user.username,
    dn: user.dn,
    displayName: user.displayName,
    email: user.email,
    mustChangePassword: user.mustChangePassword === true,
  };
}

/**
 * Busca un usuario (mock)
 * @param {string} username - Nombre de usuario
 * @returns {Promise<Object|null>} Información del usuario o null
 */
export async function searchUser(username) {
  await new Promise(resolve => setTimeout(resolve, 100));

  const user = mockUsers.get(username);
  
  if (!user) {
    return null;
  }

  return {
    dn: user.dn,
    cn: user.displayName,
    displayName: user.displayName,
    mail: user.email,
    sAMAccountName: user.username,
    userPrincipalName: user.email,
  };
}

/**
 * Cambia la contraseña de un usuario (mock)
 * @param {string} username - Nombre de usuario
 * @param {string} oldPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function changePassword(username, oldPassword, newPassword) {
  await new Promise(resolve => setTimeout(resolve, 200));

  const normalizedUsername = String(username).trim().toLowerCase();
  const user = mockUsers.get(normalizedUsername);

  if (!user) {
    throw new Error('Usuario no encontrado en LDAP');
  }

  if (user.password !== oldPassword) {
    throw new Error('La contraseña actual es incorrecta');
  }

  // Validar longitud mínima
  if (newPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  // Actualizar contraseña
  user.password = newPassword;
  user.mustChangePassword = false;
  mockUsers.set(normalizedUsername, user);
  await saveUsersToFile();
}

/**
 * Verifica si un usuario existe (mock)
 * @param {string} username - Nombre de usuario
 * @returns {Promise<boolean>}
 */
export async function userExists(username) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mockUsers.has(username);
}

/**
 * Crea un usuario de prueba (útil para testing)
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @param {string} email - Email
 * @param {string} displayName - Nombre completo
 */
export async function createMockUser(username, password, email, displayName) {
  mockUsers.set(username, {
    username,
    password,
    email,
    displayName,
    dn: `CN=${username},CN=Users,DC=urovesa,DC=com`,
  });
  await saveUsersToFile();
}

/**
 * Obtiene todos los usuarios mock (útil para debugging)
 * @returns {Array} Lista de usuarios (sin contraseñas)
 */
export function getAllMockUsers() {
  return Array.from(mockUsers.entries()).map(([username, user]) => ({
    username,
    email: user.email,
    displayName: user.displayName,
  }));
}

/**
 * Obtiene información de un usuario específico (sin contraseña)
 * @param {string} username - Nombre de usuario
 * @returns {Object|null} Información del usuario o null si no existe
 */
export function getMockUser(username) {
  const normalizedUsername = String(username).trim().toLowerCase();
  const user = mockUsers.get(normalizedUsername);
  if (!user) {
    return null;
  }
  return {
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    dn: user.dn,
  };
}

/**
 * Elimina un usuario mock (incluye usuarios creados por registro)
 * @param {string} username - Nombre de usuario a eliminar
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
export async function deleteMockUser(username) {
  await new Promise(resolve => setTimeout(resolve, 100));
  const normalizedUsername = String(username).trim().toLowerCase();
  const deleted = mockUsers.delete(normalizedUsername);
  if (deleted) {
    await saveUsersToFile();
  }
  return deleted;
}

/**
 * Cambia la contraseña de un usuario (admin)
 * @param {string} username - Nombre de usuario
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function adminChangePassword(username, newPassword) {
  await new Promise(resolve => setTimeout(resolve, 200));

  const normalizedUsername = String(username).trim().toLowerCase();
  const user = mockUsers.get(normalizedUsername);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Validar longitud mínima
  if (newPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  // Actualizar contraseña
  user.password = newPassword;
  user.mustChangePassword = true;
  mockUsers.set(normalizedUsername, user);
  await saveUsersToFile();
}

/**
 * Establece la contraseña inicial de un usuario (para registro)
 * Si el usuario no existe, lo crea. Si existe, actualiza su contraseña.
 * @param {string} username - Nombre de usuario
 * @param {string} password - Nueva contraseña
 * @param {string} email - Email del usuario
 * @param {string} displayName - Nombre completo (opcional)
 * @returns {Promise<void>}
 */
export async function setPassword(username, password, email, displayName = null) {
  await new Promise(resolve => setTimeout(resolve, 200));
  const normalizedUsername = String(username).trim().toLowerCase();

  // Validar longitud mínima
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  // Si el usuario ya existe, actualizar su contraseña
  if (mockUsers.has(normalizedUsername)) {
    const user = mockUsers.get(normalizedUsername);
    user.password = password;
    if (email) user.email = email;
    if (displayName) user.displayName = displayName;
    user.mustChangePassword = true;
    mockUsers.set(normalizedUsername, user);
  } else {
    // Si no existe, crear nuevo usuario
    mockUsers.set(normalizedUsername, {
      username: normalizedUsername,
      password,
      email: email || `${normalizedUsername}@urovesa.com`,
      displayName: displayName || normalizedUsername,
      dn: `CN=${normalizedUsername},CN=Users,DC=urovesa,DC=com`,
      mustChangePassword: true,
    });
  }
  
  // Guardar cambios
  await saveUsersToFile();
}





