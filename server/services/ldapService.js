import ldap from 'ldapjs';

/**
 * Servicio para comunicación con LDAP/Active Directory
 * 
 * Este servicio maneja:
 * - Autenticación de usuarios (bind)
 * - Cambio de contraseñas
 * - Búsqueda de información de usuario
 */

/**
 * Crea un cliente LDAP configurado
 */
function createLDAPClient() {
  const ldapUrl = process.env.LDAP_URL || 'ldaps://ldap.tuempresa.com:636';
  const tlsOptions = {};

  // Si se proporciona un certificado personalizado, configurarlo
  if (process.env.LDAP_CA_CERT) {
    tlsOptions.ca = [process.env.LDAP_CA_CERT];
  }

  // Si se requiere rechazar certificados no autorizados (por defecto en producción)
  if (process.env.LDAP_REJECT_UNAUTHORIZED !== 'false') {
    tlsOptions.rejectUnauthorized = process.env.NODE_ENV === 'production';
  }

  const client = ldap.createClient({
    url: ldapUrl,
    tlsOptions,
    reconnect: {
      initialDelay: 100,
      maxDelay: 300,
      failAfter: 3,
      maxReconnectAttempts: 3,
    },
  });

  return client;
}

/**
 * Construye el DN (Distinguished Name) de un usuario
 * @param {string} username - Nombre de usuario o identificador
 * @returns {string} DN completo del usuario
 */
function buildUserDN(username) {
  const baseDN = process.env.LDAP_BASE_DN || 'dc=tuempresa,dc=com';
  const userDNFormat = process.env.LDAP_USER_DN_FORMAT || 'CN={username},CN=Users,{baseDN}';
  
  // Formato por defecto para Active Directory
  return userDNFormat
    .replace('{username}', username)
    .replace('{baseDN}', baseDN);
}

/**
 * Busca un usuario en LDAP por su nombre de usuario
 * @param {string} username - Nombre de usuario a buscar
 * @returns {Promise<Object|null>} Información del usuario o null si no se encuentra
 */
export async function searchUser(username) {
  const client = createLDAPClient();
  const baseDN = process.env.LDAP_BASE_DN || 'dc=tuempresa,dc=com';
  const searchFilter = process.env.LDAP_SEARCH_FILTER || `(sAMAccountName=${username})`;
  
  return new Promise((resolve, reject) => {
    client.bind(
      process.env.LDAP_ADMIN_DN || `CN=Administrator,CN=Users,${baseDN}`,
      process.env.LDAP_ADMIN_PASSWORD || '',
      (bindErr) => {
        if (bindErr) {
          client.unbind();
          return reject(new Error(`Error de autenticación admin LDAP: ${bindErr.message}`));
        }

        const opts = {
          filter: searchFilter.replace('{username}', username),
          scope: 'sub',
          attributes: ['cn', 'displayName', 'mail', 'sAMAccountName', 'userPrincipalName'],
        };

        client.search(baseDN, opts, (searchErr, res) => {
          if (searchErr) {
            client.unbind();
            return reject(new Error(`Error de búsqueda LDAP: ${searchErr.message}`));
          }

          let found = false;
          res.on('searchEntry', (entry) => {
            found = true;
            const user = {
              dn: entry.dn.toString(),
              cn: entry.object.cn,
              displayName: entry.object.displayName || entry.object.cn,
              mail: entry.object.mail,
              sAMAccountName: entry.object.sAMAccountName,
              userPrincipalName: entry.object.userPrincipalName,
            };
            client.unbind();
            resolve(user);
          });

          res.on('error', (err) => {
            client.unbind();
            reject(new Error(`Error en búsqueda LDAP: ${err.message}`));
          });

          res.on('end', () => {
            if (!found) {
              client.unbind();
              resolve(null);
            }
          });
        });
      }
    );
  });
}

/**
 * Autentica un usuario contra LDAP/Active Directory
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Información del usuario autenticado
 */
export async function authenticateUser(username, password) {
  const client = createLDAPClient();
  
  // Primero intentamos buscar el usuario para obtener su DN completo
  let userDN;
  try {
    const user = await searchUser(username);
    if (!user) {
      throw new Error('Usuario no encontrado en LDAP');
    }
    userDN = user.dn;
  } catch (error) {
    // Si la búsqueda falla, intentamos con el formato de DN configurado
    userDN = buildUserDN(username);
  }

  return new Promise((resolve, reject) => {
    client.bind(userDN, password, (err) => {
      client.unbind();
      
      if (err) {
        // Error de autenticación
        if (err.code === 49 || err.name === 'InvalidCredentialsError') {
          return reject(new Error('Credenciales inválidas'));
        }
        return reject(new Error(`Error de autenticación LDAP: ${err.message}`));
      }

      // Si la autenticación es exitosa, obtenemos la información del usuario
      searchUser(username)
        .then((userInfo) => {
          resolve({
            username,
            dn: userDN,
            displayName: userInfo?.displayName || username,
            email: userInfo?.mail || userInfo?.userPrincipalName || `${username}@tuempresa.com`,
            ...userInfo,
          });
        })
        .catch(() => {
          // Si no podemos obtener la info, al menos devolvemos lo básico
          resolve({
            username,
            dn: userDN,
            displayName: username,
            email: `${username}@tuempresa.com`,
          });
        });
    });
  });
}

/**
 * Cambia la contraseña de un usuario en Active Directory
 * @param {string} username - Nombre de usuario
 * @param {string} oldPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<void>}
 */
export async function changePassword(username, oldPassword, newPassword) {
  const client = createLDAPClient();
  
  // Primero verificamos que las credenciales actuales son correctas
  let userDN;
  try {
    const user = await searchUser(username);
    if (!user) {
      throw new Error('Usuario no encontrado en LDAP');
    }
    userDN = user.dn;
  } catch (error) {
    userDN = buildUserDN(username);
  }

  return new Promise((resolve, reject) => {
    // 1. Verificar credenciales actuales
    client.bind(userDN, oldPassword, (bindErr) => {
      if (bindErr) {
        client.unbind();
        if (bindErr.code === 49 || bindErr.name === 'InvalidCredentialsError') {
          return reject(new Error('La contraseña actual es incorrecta'));
        }
        return reject(new Error(`Error de autenticación: ${bindErr.message}`));
      }

      // 2. Re-autenticar como administrador para cambiar la contraseña
      const adminDN = process.env.LDAP_ADMIN_DN || `CN=Administrator,CN=Users,${process.env.LDAP_BASE_DN || 'dc=tuempresa,dc=com'}`;
      const adminPassword = process.env.LDAP_ADMIN_PASSWORD || '';

      client.bind(adminDN, adminPassword, (adminBindErr) => {
        if (adminBindErr) {
          client.unbind();
          return reject(new Error(`Error de autenticación admin: ${adminBindErr.message}`));
        }

        // 3. Cambiar la contraseña
        // En Active Directory, unicodePwd debe estar entre comillas dobles y en UTF-16LE
        const change = new ldap.Change({
          operation: 'replace',
          modification: {
            unicodePwd: Buffer.from(`"${newPassword}"`, 'utf16le'),
          },
        });

        client.modify(userDN, change, (modifyErr) => {
          client.unbind();
          
          if (modifyErr) {
            // Errores comunes de Active Directory
            if (modifyErr.code === 53) {
              return reject(new Error('La contraseña no cumple con las políticas de seguridad'));
            }
            if (modifyErr.code === 19) {
              return reject(new Error('La contraseña no cumple con los requisitos de complejidad'));
            }
            return reject(new Error(`Error al cambiar contraseña: ${modifyErr.message}`));
          }

          resolve();
        });
      });
    });
  });
}

/**
 * Verifica si un usuario existe en LDAP
 * @param {string} username - Nombre de usuario
 * @returns {Promise<boolean>}
 */
export async function userExists(username) {
  try {
    const user = await searchUser(username);
    return user !== null;
  } catch {
    return false;
  }
}









