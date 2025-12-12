/**
 * Servicio de autenticación mock para desarrollo y pruebas
 * 
 * Este servicio simula la autenticación LDAP sin necesidad de un servidor real.
 * Útil para probar 2FA y otras funcionalidades sin configurar LDAP.
 * 
 * Para habilitar: establecer MOCK_AUTH=true en .env
 */

// Usuarios de prueba en memoria
const mockUsers = new Map([
  ['testuser', {
    username: 'testuser',
    password: 'password123', // En producción NUNCA hacer esto
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
]);

/**
 * Autentica un usuario (mock)
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} Información del usuario autenticado
 */
export async function authenticateUser(username, password) {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 200));

  const user = mockUsers.get(username);

  if (!user) {
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

  const user = mockUsers.get(username);

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
  mockUsers.set(username, user);
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
export function createMockUser(username, password, email, displayName) {
  mockUsers.set(username, {
    username,
    password,
    email,
    displayName,
    dn: `CN=${username},CN=Users,DC=urovesa,DC=com`,
  });
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





