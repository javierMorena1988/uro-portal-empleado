import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSecret, generateQRCode, verifyToken } from './services/twoFactorService.js';
import { saveSecret, getSecret, is2FAEnabled, enable2FA, disable2FA, hasSecret } from './services/twoFactorStorage.js';

// Obtener el directorio actual del módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde la raíz del proyecto (un nivel arriba de server/)
dotenv.config({ path: join(__dirname, '..', '.env') });

// Usar mock o LDAP real según configuración
const useMockAuth = process.env.MOCK_AUTH === 'true';

// eslint-disable-next-line no-console
console.log('[Config] MOCK_AUTH value:', process.env.MOCK_AUTH);
// eslint-disable-next-line no-console
console.log('[Config] useMockAuth:', useMockAuth);

// Importar servicios (solo mock si estamos en modo mock)
import * as mockAuthService from './services/mockAuthService.js';

// Seleccionar qué servicio usar (SIEMPRE mock por ahora para pruebas)
const authService = mockAuthService;
const authenticateUser = authService.authenticateUser;
const changePassword = authService.changePassword;

// eslint-disable-next-line no-console
console.log('[Auth] Using MOCK authentication service (no LDAP required)');
// eslint-disable-next-line no-console
console.log('[Auth] authenticateUser type:', typeof authenticateUser);

const app = express();
const port = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Verificar variables de entorno requeridas para Therefore
const requiredEnv = ['THEREFORE_BASE_URL', 'THEREFORE_USERNAME', 'THEREFORE_PASSWORD'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(`[Therefore Proxy] Missing env vars: ${missing.join(', ')}`);
}

// Verificar variables de entorno LDAP (opcional, solo se requiere si se usa LDAP)
const ldapEnvVars = ['LDAP_URL', 'LDAP_BASE_DN', 'LDAP_ADMIN_DN', 'LDAP_ADMIN_PASSWORD'];
const missingLdap = ldapEnvVars.filter((k) => !process.env[k]);
if (missingLdap.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(`[LDAP Service] Missing env vars (LDAP no configurado): ${missingLdap.join(', ')}`);
  // eslint-disable-next-line no-console
  console.warn(`[LDAP Service] Para habilitar LDAP, configura estas variables en .env`);
}

function buildAuthHeaders() {
  const { THEREFORE_USERNAME, THEREFORE_PASSWORD, THEREFORE_TENANT } = process.env;
  const basic = Buffer.from(`${THEREFORE_USERNAME}:${THEREFORE_PASSWORD}`).toString('base64');
  const headers = {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/json',
  };
  if (THEREFORE_TENANT) {
    headers['X-Therefore-Online-Tenant'] = THEREFORE_TENANT;
  }
  return headers;
}

function joinUrl(...parts) {
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/\/$/, '') : p.replace(/^\//, '').replace(/\/$/, '')))
    .join('/');
}

// POST /api/therefore/executeSingleQuery
app.post('/api/therefore/executeSingleQuery', async (req, res) => {
  try {
    const base = process.env.THEREFORE_BASE_URL; // e.g., https://myserver.com/theservice/v0001/restun
    const url = joinUrl(base, 'Document/ExecuteSingleQuery');
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(req.body || {}),
    });
    const data = await resp.json().catch(() => null);
    res.status(resp.status).json(data ?? {});
  } catch (err) {
    res.status(500).json({ message: 'ExecuteSingleQuery failed' });
  }
});

// GET /api/therefore/getDocument?docNo=123
app.get('/api/therefore/getDocument', async (req, res) => {
  try {
    const { docNo } = req.query;
    if (!docNo) return res.status(400).json({ message: 'Missing docNo' });
    
    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      // eslint-disable-next-line no-console
      console.error('[Therefore] THEREFORE_BASE_URL no está configurado');
      return res.status(500).json({ 
        message: 'GetDocument failed: THEREFORE_BASE_URL no configurado',
        error: 'Configura THEREFORE_BASE_URL en el archivo .env'
      });
    }

    const { THEREFORE_USERNAME, THEREFORE_PASSWORD } = process.env;
    if (!THEREFORE_USERNAME || !THEREFORE_PASSWORD) {
      // eslint-disable-next-line no-console
      console.error('[Therefore] Credenciales no configuradas');
      return res.status(500).json({ 
        message: 'GetDocument failed: Credenciales de Therefore no configuradas',
        error: 'Configura THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env'
      });
    }

    const url = joinUrl(base, `Document/GetDocument?DocNo=${encodeURIComponent(docNo)}`);
    // eslint-disable-next-line no-console
    console.log('[Therefore] Consultando documento:', docNo);
    // eslint-disable-next-line no-console
    console.log('[Therefore] URL:', url);
    
    const resp = await fetch(url, { headers: buildAuthHeaders() });
    
    // eslint-disable-next-line no-console
    console.log('[Therefore] Respuesta status:', resp.status);
    
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Error desconocido');
      // eslint-disable-next-line no-console
      console.error('[Therefore] Error en respuesta:', errorText);
      return res.status(resp.status).json({ 
        message: 'GetDocument failed',
        error: errorText,
        status: resp.status
      });
    }
    
    const data = await resp.json().catch(() => null);
    res.status(resp.status).json(data ?? {});
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Therefore] Error en getDocument:', err.message);
    // eslint-disable-next-line no-console
    console.error('[Therefore] Stack:', err.stack);
    res.status(500).json({ 
      message: 'GetDocument failed',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/therefore/createDocument
app.post('/api/therefore/createDocument', async (req, res) => {
  try {
    const base = process.env.THEREFORE_BASE_URL;
    const url = joinUrl(base, 'Document/CreateDocument');
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(req.body || {}),
    });
    const data = await resp.json().catch(() => null);
    res.status(resp.status).json(data ?? {});
  } catch (err) {
    res.status(500).json({ message: 'CreateDocument failed' });
  }
});

// ==================== ENDPOINTS LDAP/AUTH ====================

/**
 * POST /api/auth/login
 * Autentica un usuario contra LDAP/Active Directory
 * Body: { username: string, password: string, twoFactorCode?: string }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, twoFactorCode } = req.body;

    // eslint-disable-next-line no-console
    console.log('[Login] Intentando login para:', username);

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Usuario y contraseña son requeridos' 
      });
    }

    // Autenticar contra LDAP
    // eslint-disable-next-line no-console
    console.log('[Login] Autenticando usuario...');
    // eslint-disable-next-line no-console
    console.log('[Login] authenticateUser es:', typeof authenticateUser);
    
    if (!authenticateUser) {
      // eslint-disable-next-line no-console
      console.error('[Login] ERROR: authenticateUser no está definido!');
      return res.status(500).json({
        success: false,
        error: 'Error de configuración del servidor',
        details: 'authenticateUser no está definido',
      });
    }
    
    const user = await authenticateUser(username, password);
    // eslint-disable-next-line no-console
    console.log('[Login] Usuario autenticado:', user.username);

    // Verificar si el usuario tiene 2FA habilitado
    const has2FA = is2FAEnabled(username);
    const hasStoredSecret = hasSecret(username);
    // eslint-disable-next-line no-console
    console.log('[Login] Usuario tiene 2FA habilitado:', has2FA, 'Tiene secreto guardado:', hasStoredSecret);
    
    // Si tiene un secreto guardado (incluso si no está habilitado), primero intentar con código
    // Esto permite que usuarios que ya escanearon el QR puedan usar el código sin reconfigurar
    if (hasStoredSecret && !twoFactorCode) {
      // eslint-disable-next-line no-console
      console.log('[Login] Usuario tiene secreto guardado, requiere código 2FA');
      return res.status(200).json({
        success: false,
        requiresTwoFactor: true,
        message: 'Se requiere código de autenticación de doble factor',
      });
    }

    // Si no tiene secreto guardado, debe configurarlo primero
    if (!hasStoredSecret) {
      return res.status(403).json({
        success: false,
        requires2FASetup: true,
        error: 'Debes configurar la autenticación de doble factor antes de poder iniciar sesión. Por favor, contacta con el administrador o configura 2FA desde tu perfil.',
        message: '2FA no configurado. Debe configurarse antes del primer acceso.',
      });
    }
    
    // Si tiene 2FA habilitado pero no tiene código, pedirlo
    if (has2FA && !twoFactorCode) {
      // eslint-disable-next-line no-console
      console.log('[Login] Requiere código 2FA');
      return res.status(200).json({
        success: false,
        requiresTwoFactor: true,
        message: 'Se requiere código de autenticación de doble factor',
      });
    }

    // Si tiene código, verificar el código 2FA
    if (twoFactorCode) {
      const userSecret = getSecret(username);
      if (!userSecret || !verifyToken(userSecret.secret, twoFactorCode)) {
        return res.status(401).json({
          success: false,
          error: 'Código de autenticación de doble factor inválido',
        });
      }
      
      // Si el código es válido pero 2FA no estaba habilitado, habilitarlo ahora
      if (!has2FA) {
        // eslint-disable-next-line no-console
        console.log('[Login] Código válido, habilitando 2FA para usuario:', username);
        await enable2FA(username);
      }
    }

    // Generar token JWT
    const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_cambiar_en_produccion';
    const token = jwt.sign(
      { 
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // eslint-disable-next-line no-console
    console.log('[Login] Login exitoso, generando token...');
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        email: user.email,
        name: user.displayName || user.username,
      },
    });
    // eslint-disable-next-line no-console
    console.log('[Login] Respuesta enviada');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[LDAP Auth] Error:', error.message);
    // eslint-disable-next-line no-console
    console.error('[LDAP Auth] Stack:', error.stack);
    // eslint-disable-next-line no-console
    console.error('[LDAP Auth] Error completo:', error);
    
    // Errores de autenticación
    if (error.message && (error.message.includes('Credenciales inválidas') || 
        error.message.includes('Usuario no encontrado'))) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
      });
    }

    // Otros errores
    res.status(500).json({
      success: false,
      error: 'Error al autenticar usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/auth/change-password
 * Cambia la contraseña de un usuario en LDAP/Active Directory
 * Body: { username: string, oldPassword: string, newPassword: string }
 */
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Usuario, contraseña actual y nueva contraseña son requeridos',
      });
    }

    // Validar longitud mínima de contraseña
    const minLength = parseInt(process.env.LDAP_PASSWORD_MIN_LENGTH || '8', 10);
    if (newPassword.length < minLength) {
      return res.status(400).json({
        success: false,
        error: `La contraseña debe tener al menos ${minLength} caracteres`,
      });
    }

    // Cambiar contraseña en LDAP
    await changePassword(username, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Contraseña cambiada correctamente',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[LDAP Change Password] Error:', error.message);

    // Errores de autenticación
    if (error.message.includes('contraseña actual es incorrecta')) {
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta',
      });
    }

    // Errores de políticas de contraseña
    if (error.message.includes('políticas de seguridad') || 
        error.message.includes('requisitos de complejidad')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    // Otros errores
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/auth/verify
 * Verifica un token JWT (opcional, para validar sesión)
 * Headers: Authorization: Bearer <token>
 */
app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_cambiar_en_produccion';
    
    const decoded = jwt.verify(token, jwtSecret);
    
    res.json({
      success: true,
      user: decoded,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
    });
  }
});

// ==================== ENDPOINTS 2FA ====================

/**
 * POST /api/auth/2fa/setup
 * Genera un secreto 2FA y QR code para un usuario
 * Body: { username: string, password?: string }
 * Si se proporciona password, valida credenciales LDAP primero (para usuarios sin 2FA configurado)
 */
app.post('/api/auth/2fa/setup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Usuario requerido',
      });
    }

    // Si se proporciona password, validar credenciales LDAP primero
    // Esto permite configurar 2FA antes del primer login
    if (password) {
      try {
        const user = await authenticateUser(username, password);
        // eslint-disable-next-line no-console
        console.log('[2FA Setup] Credenciales LDAP validadas para:', user.username);
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas. Debes proporcionar usuario y contraseña correctos para configurar 2FA.',
        });
      }
    }

    // Verificar si ya tiene 2FA habilitado o tiene un secreto guardado
    if (is2FAEnabled(username)) {
      return res.status(400).json({
        success: false,
        error: '2FA ya está configurado para este usuario. Si ya escaneaste el QR, simplemente ingresa el código de 6 dígitos de tu aplicación de autenticación.',
      });
    }
    
    // Si tiene un secreto guardado pero no está habilitado, sugerir usar el código existente
    if (hasSecret(username)) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes un código 2FA configurado. Por favor, ingresa el código de 6 dígitos de tu aplicación de autenticación. Si no tienes acceso, contacta al administrador.',
      });
    }

    // Generar secreto
    const { secret, otpauth_url } = generateSecret(username);
    
    // Guardar secreto (aún no habilitado)
    await saveSecret(username, secret);

    // Generar QR code
    const qrCode = await generateQRCode(otpauth_url);

    res.json({
      success: true,
      secret, // Solo para desarrollo, en producción no enviar
      qrCode,
      otpauth_url,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[2FA Setup] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al configurar 2FA',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verifica un código 2FA y habilita 2FA para el usuario
 * Body: { username: string, code: string }
 */
app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y código requeridos',
      });
    }

    const userSecret = getSecret(username);
    if (!userSecret) {
      return res.status(404).json({
        success: false,
        error: '2FA no configurado para este usuario',
      });
    }

    // Verificar código
    if (!verifyToken(userSecret.secret, code)) {
      return res.status(401).json({
        success: false,
        error: 'Código inválido',
      });
    }

    // Habilitar 2FA
    await enable2FA(username);

    res.json({
      success: true,
      message: '2FA habilitado correctamente',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[2FA Verify] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al verificar código 2FA',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/auth/2fa/status
 * Verifica si un usuario tiene 2FA habilitado
 * Query: ?username=usuario
 */
app.get('/api/auth/2fa/status', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Usuario requerido',
      });
    }

    const enabled = is2FAEnabled(username);

    res.json({
      success: true,
      enabled,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[2FA Status] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al verificar estado 2FA',
    });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Deshabilita 2FA para un usuario (SOLO PARA DESARROLLO/PRUEBAS)
 * Body: { username: string }
 */
if (process.env.NODE_ENV === 'development') {
  app.post('/api/auth/2fa/disable', async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Usuario requerido',
        });
      }

      await disable2FA(username);

      res.json({
        success: true,
        message: '2FA deshabilitado correctamente',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[2FA Disable] Error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error al deshabilitar 2FA',
        details: error.message,
      });
    }
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[Server] Listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[Therefore Proxy] Enabled`);
  if (useMockAuth) {
    // eslint-disable-next-line no-console
    console.log(`[Auth] MOCK mode enabled - Using test users (testuser/password123, admin/admin123)`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[LDAP Auth] ${missingLdap.length === 0 ? 'Enabled' : 'Disabled (configure .env)'}`);
  }
  // eslint-disable-next-line no-console
  console.log(`[2FA] Enabled`);
});



