import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSecret, generateQRCode, verifyToken } from './services/twoFactorService.js';
import { saveSecret, getSecret, is2FAEnabled, enable2FA, disable2FA, hasSecret } from './services/twoFactorStorage.js';
import { findEmpleadoByEmail } from './services/empleadosService.js';

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

// Importar servicios
import * as mockAuthService from './services/mockAuthService.js';
import * as ldapAuthService from './services/ldapService.js';

// Seleccionar qué servicio usar según configuración
let authService;
let authenticateUser;
let changePassword;

if (useMockAuth) {
  authService = mockAuthService;
  // eslint-disable-next-line no-console
  console.log('[Auth] Using MOCK authentication service (no LDAP required)');
} else {
  authService = ldapAuthService;
  // eslint-disable-next-line no-console
  console.log('[Auth] Using LDAP authentication service (real Active Directory)');
  
  // Verificar variables de entorno LDAP
  const ldapRequiredVars = ['LDAP_URL', 'LDAP_BASE_DN', 'LDAP_ADMIN_DN', 'LDAP_ADMIN_PASSWORD'];
  const missingLdapVars = ldapRequiredVars.filter((k) => !process.env[k]);
  if (missingLdapVars.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[LDAP Service] Missing env vars (LDAP no configurado):', missingLdapVars.join(', '));
    // eslint-disable-next-line no-console
    console.error('[LDAP Service] Para habilitar LDAP, configura estas variables en .env');
  }
}

authenticateUser = authService.authenticateUser;
changePassword = authService.changePassword;

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
    const base = process.env.THEREFORE_BASE_URL; // e.g., https://therefore.urovesa.com:443/theservice/v0001/restun
    const url = joinUrl(base, 'ExecuteSingleQuery');
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

// POST /api/therefore/publicDocuments
// Obtiene documentos públicos para un empleado usando ExecuteSingleQuery
// Body: { idEmpleado: string }
app.post('/api/therefore/publicDocuments', async (req, res) => {
  try {
    const { idEmpleado } = req.body;
    
    if (!idEmpleado) {
      return res.status(400).json({ 
        success: false,
        error: 'idEmpleado es requerido' 
      });
    }
    
    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      return res.status(500).json({ 
        success: false,
        error: 'THEREFORE_BASE_URL no configurado' 
      });
    }

    const { THEREFORE_USERNAME, THEREFORE_PASSWORD } = process.env;
    if (!THEREFORE_USERNAME || !THEREFORE_PASSWORD) {
      return res.status(500).json({ 
        success: false,
        error: 'Credenciales de Therefore no configuradas' 
      });
    }

    // Construir la petición EXACTAMENTE como se proporcionó
    const requestBody = {
      FullText: '',
      Query: {
        CategoryNo: 64,
        Conditions: [{
          Condition: String(idEmpleado),
          FieldNoOrName: 'idEmpleado',
          TimeZone: 0
        }],
        FileByColName: '',
        FileByFieldNo: 0,
        MaxRows: 100,
        Mode: 0,
        OrderByFieldsNoOrNames: [],
        RowBlockSize: 100,
        SelectedFieldsNoOrNames: ['nombreDocumento', 'tipoDocumento'],
        GroupByFieldsNoOrNames: [],
        IsPersonalQuery: false,
        QueryNo: 2147483647,
        FullText: ''
      }
    };

    const url = joinUrl(base, 'ExecuteSingleQuery');
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Consultando documentos para empleado:', idEmpleado);
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Request body:', JSON.stringify(requestBody, null, 2));
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] URL:', url);
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(requestBody),
    });
    
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Error desconocido');
      // eslint-disable-next-line no-console
      console.error('[PublicDocuments] Error en respuesta:', errorText);
      return res.status(resp.status).json({ 
        success: false,
        error: errorText,
        status: resp.status
      });
    }
    
    const data = await resp.json().catch(() => null);
    
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Respuesta completa de Therefore:', JSON.stringify(data, null, 2));
    
    // Extraer los documentos de la respuesta de Therefore
    // La estructura es: QueryResult.ResultRows
    let documents = [];
    if (data && data.QueryResult && data.QueryResult.ResultRows && Array.isArray(data.QueryResult.ResultRows)) {
      documents = data.QueryResult.ResultRows;
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] Documentos encontrados en QueryResult.ResultRows:', documents.length);
    } else if (data && Array.isArray(data)) {
      documents = data;
    } else if (data && data.Results && Array.isArray(data.Results)) {
      documents = data.Results;
    } else if (data && data.Documents && Array.isArray(data.Documents)) {
      documents = data.Documents;
    } else if (data && data.Query && data.Query.Results && Array.isArray(data.Query.Results)) {
      documents = data.Query.Results;
    } else if (data && typeof data === 'object') {
      // Si es un objeto, intentar encontrar arrays dentro
      for (const key in data) {
        if (Array.isArray(data[key])) {
          documents = data[key];
          // eslint-disable-next-line no-console
          console.log(`[PublicDocuments] Documentos encontrados en clave '${key}':`, documents.length);
          break;
        }
      }
    }
    
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Documentos extraídos:', documents.length);
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Primer documento (ejemplo):', documents[0] || 'No hay documentos');
    
    // Si no encontramos documentos, devolver la estructura completa para debug
    if (documents.length === 0 && data) {
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] ⚠️ No se encontraron documentos. Estructura de respuesta:', Object.keys(data));
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] Tipo de respuesta:', typeof data);
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] ¿Es array?', Array.isArray(data));
    }
    
    // Siempre incluir debug para ver qué está devolviendo Therefore
    res.json({
      success: true,
      documents,
      total: documents.length,
      // Incluir la respuesta raw para debug (siempre, no solo en desarrollo)
      debug: {
        rawResponse: data,
        responseType: typeof data,
        isArray: Array.isArray(data),
        keys: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : null,
        hasResults: data && data.Results ? true : false,
        hasDocuments: data && data.Documents ? true : false,
        hasQuery: data && data.Query ? true : false,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PublicDocuments] Error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Error al obtener documentos públicos',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/therefore/getDocument
// Body: { DocNo: number, VersionNo?: number }
app.post('/api/therefore/getDocument', async (req, res) => {
  try {
    const { DocNo, VersionNo } = req.body;
    
    if (!DocNo) {
      return res.status(400).json({ 
        message: 'Missing DocNo',
        error: 'DocNo es requerido en el body de la petición'
      });
    }
    
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

    // Construir el body para Therefore
    const requestBody = { DocNo };
    if (VersionNo !== undefined) {
      requestBody.VersionNo = VersionNo;
    }

    const url = joinUrl(base, 'GetDocument');
    // eslint-disable-next-line no-console
    console.log('[Therefore] Consultando documento:', DocNo, VersionNo ? `versión ${VersionNo}` : '(última versión)');
    // eslint-disable-next-line no-console
    console.log('[Therefore] URL:', url);
    // eslint-disable-next-line no-console
    console.log('[Therefore] Body:', JSON.stringify(requestBody));
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(requestBody),
    });
    
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

// POST /api/therefore/downloadDocument
// Body: { DocNo: number, VersionNo?: number }
// Descarga el archivo del documento desde Therefore
app.post('/api/therefore/downloadDocument', async (req, res) => {
  try {
    const { DocNo, VersionNo } = req.body;
    
    if (!DocNo) {
      return res.status(400).json({ 
        message: 'Missing DocNo',
        error: 'DocNo es requerido en el body de la petición'
      });
    }
    
    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      // eslint-disable-next-line no-console
      console.error('[Therefore] THEREFORE_BASE_URL no está configurado');
      return res.status(500).json({ 
        message: 'DownloadDocument failed: THEREFORE_BASE_URL no configurado',
        error: 'Configura THEREFORE_BASE_URL en el archivo .env'
      });
    }

    const { THEREFORE_USERNAME, THEREFORE_PASSWORD } = process.env;
    if (!THEREFORE_USERNAME || !THEREFORE_PASSWORD) {
      // eslint-disable-next-line no-console
      console.error('[Therefore] Credenciales no configuradas');
      return res.status(500).json({ 
        message: 'DownloadDocument failed: Credenciales de Therefore no configuradas',
        error: 'Configura THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env'
      });
    }

    // Construir el body para Therefore según la documentación
    // https://therefore.net/help/2024/en-us/AR/SDK/WebAPI/the_webapi_operation_getdocument.html
    const requestBody = { 
      DocNo,
      IsStreamsInfoAndDataNeeded: true, // Necesario para obtener el contenido del archivo
      IsStreamDataBase64JSONNeeded: true // Para obtener stream data como Base64 string en JSON
    };
    if (VersionNo !== undefined) {
      requestBody.VersionNo = VersionNo;
    } else {
      requestBody.VersionNo = 0; // 0 = última versión según la documentación
    }

    // Usar GetDocument directamente como me indicaron
    const url = joinUrl(base, 'GetDocument');
    // eslint-disable-next-line no-console
    console.log('[Therefore] Descargando documento:', DocNo, VersionNo ? `versión ${VersionNo}` : '(última versión)');
    // eslint-disable-next-line no-console
    console.log('[Therefore] URL:', url);
    // eslint-disable-next-line no-console
    console.log('[Therefore] Body:', JSON.stringify(requestBody));
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(requestBody),
    });
    
    // eslint-disable-next-line no-console
    console.log('[Therefore] Respuesta status:', resp.status);
    // eslint-disable-next-line no-console
    console.log('[Therefore] Content-Type:', resp.headers.get('content-type'));
    
    if (!resp.ok) {
      // Verificar si es error de autenticación
      let errorText = await resp.text().catch(() => 'Error desconocido');
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.WSError && errorJson.WSError.ErrorCodeString === 'InvalidLogin') {
          // eslint-disable-next-line no-console
          console.error('[Therefore] Error de autenticación con GetDocument');
          return res.status(401).json({ 
            message: 'Error de autenticación con Therefore',
            error: 'Credenciales inválidas. Verifica THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env',
            details: errorJson.WSError.ErrorMessage || 'Invalid user name or password',
            status: 401
          });
        }
        if (errorJson.WSError && errorJson.WSError.ErrorMessage) {
          errorText = errorJson.WSError.ErrorMessage;
        }
      } catch (e) {
        // Si no es JSON, usar el texto tal cual
      }
      
      // eslint-disable-next-line no-console
      console.error('[Therefore] Error en respuesta:', errorText);
      return res.status(resp.status).json({ 
        message: 'DownloadDocument failed',
        error: errorText,
        status: resp.status
      });
    }
    
    // GetDocument siempre devuelve JSON según la documentación
    const docData = await resp.json().catch(() => null);
    
    if (!docData) {
      return res.status(500).json({ 
        message: 'DownloadDocument failed',
        error: 'No se pudo parsear la respuesta de Therefore'
      });
    }
    
    // eslint-disable-next-line no-console
    console.log('[Therefore] GetDocument devolvió JSON');
    
    // Según la documentación, los streams están en StreamsInfo
    // https://therefore.net/help/2024/en-us/AR/SDK/WebAPI/the_webapi_operation_getdocument.html
    if (docData.StreamsInfo && docData.StreamsInfo.length > 0) {
      const stream = docData.StreamsInfo[0]; // Tomar el primer stream
      
      // Intentar obtener los datos del stream
      let streamData = null;
      let filename = stream.FileName || `document_${DocNo}.pdf`;
      
      // Preferir StreamDataBase64JSON si está disponible (más fácil de manejar en JSON)
      if (stream.StreamDataBase64JSON) {
        streamData = Buffer.from(stream.StreamDataBase64JSON, 'base64');
        // eslint-disable-next-line no-console
        console.log('[Therefore] Usando StreamDataBase64JSON');
      } else if (stream.StreamData) {
        // StreamData puede venir como base64Binary (array de bytes en JSON)
        if (typeof stream.StreamData === 'string') {
          streamData = Buffer.from(stream.StreamData, 'base64');
        } else if (Array.isArray(stream.StreamData)) {
          // Si viene como array de bytes
          streamData = Buffer.from(stream.StreamData);
        } else {
          streamData = Buffer.from(stream.StreamData);
        }
        // eslint-disable-next-line no-console
        console.log('[Therefore] Usando StreamData');
      }
      
      if (streamData) {
        // Determinar el tipo de contenido basado en la extensión del archivo
        const ext = filename.split('.').pop()?.toLowerCase();
        const contentTypeMap = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', streamData.length);
        return res.send(streamData);
      }
    }
    
    // Si no hay streams o no se pudo extraer el contenido
    // eslint-disable-next-line no-console
    console.warn('[Therefore] No se encontró contenido del stream en la respuesta');
    return res.status(500).json({ 
      message: 'DownloadDocument failed',
      error: 'No se encontró contenido del documento en la respuesta',
      details: 'El documento puede no tener streams o los datos no están disponibles'
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Therefore] Error en downloadDocument:', err.message);
    // eslint-disable-next-line no-console
    console.error('[Therefore] Stack:', err.stack);
    res.status(500).json({ 
      message: 'DownloadDocument failed',
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

// ==================== ENDPOINT GET DICTIONARY INFO ====================
/**
 * POST /api/therefore/getDictionaryInfo
 * Obtiene información del diccionario de Therefore (descripciones de tipos de documento)
 * Body: { ByDictionaryID: number }
 */
app.post('/api/therefore/getDictionaryInfo', async (req, res) => {
  try {
    const { ByDictionaryID } = req.body;
    
    if (!ByDictionaryID) {
      return res.status(400).json({ 
        success: false,
        error: 'ByDictionaryID es requerido' 
      });
    }
    
    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      return res.status(500).json({ 
        success: false,
        error: 'THEREFORE_BASE_URL no configurado' 
      });
    }

    const { THEREFORE_USERNAME, THEREFORE_PASSWORD } = process.env;
    if (!THEREFORE_USERNAME || !THEREFORE_PASSWORD) {
      return res.status(500).json({ 
        success: false,
        error: 'Credenciales de Therefore no configuradas' 
      });
    }

    const requestBody = {
      ByDictionaryID: Number(ByDictionaryID),
    };

    const url = joinUrl(base, 'GetDictionaryInfo');
    // eslint-disable-next-line no-console
    console.log('[GetDictionaryInfo] Consultando diccionario:', ByDictionaryID);
    // eslint-disable-next-line no-console
    console.log('[GetDictionaryInfo] URL:', url);
    // eslint-disable-next-line no-console
    console.log('[GetDictionaryInfo] Request body:', JSON.stringify(requestBody, null, 2));
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(requestBody),
    });
    
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Error desconocido');
      // eslint-disable-next-line no-console
      console.error('[GetDictionaryInfo] Error en respuesta:', errorText);
      return res.status(resp.status).json({ 
        success: false,
        error: errorText,
        status: resp.status
      });
    }
    
    const data = await resp.json().catch(() => null);
    
    // eslint-disable-next-line no-console
    console.log('[GetDictionaryInfo] Respuesta completa de Therefore:', JSON.stringify(data, null, 2));
    
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[GetDictionaryInfo] Error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Error al obtener información del diccionario',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ==================== ENDPOINT DEBUG EMPLEADOS ====================
/**
 * GET /api/debug/empleados
 * Endpoint temporal para debug - muestra la respuesta completa de la API de empleados
 */
app.get('/api/debug/empleados', async (req, res) => {
  try {
    const { getEmpleadosList } = await import('./services/empleadosService.js');
    const empleados = await getEmpleadosList();
    
    res.json({
      success: true,
      total: empleados.length,
      empleados: empleados.slice(0, 10), // Primeros 10 para no saturar
      message: 'Endpoint de debug - revisa la consola del servidor para más detalles',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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

    // Normalizar username: si viene como email, extraer la parte antes del @
    let cleanUsername = String(username).trim().toLowerCase();
    let userEmail = String(username).trim().toLowerCase();
    
    // Si viene como email, guardar el email completo y extraer username
    if (cleanUsername.includes('@')) {
      userEmail = cleanUsername; // Mantener email completo
      cleanUsername = cleanUsername.split('@')[0];
      // eslint-disable-next-line no-console
      console.log('[Login] Username viene como email, extrayendo:', cleanUsername);
    } else {
      // Si no viene como email, construir email asumiendo dominio
      userEmail = `${cleanUsername}@urovesa.com`;
    }
    
    // eslint-disable-next-line no-console
    console.log('[Login] Username normalizado:', cleanUsername);
    // eslint-disable-next-line no-console
    console.log('[Login] Email a verificar:', userEmail);

    // PASO 1: Verificar que el email está en la lista de empleados con acceso
    // eslint-disable-next-line no-console
    console.log('[Login] Verificando acceso del empleado...');
    const empleado = await findEmpleadoByEmail(userEmail);
    
    if (!empleado) {
      // eslint-disable-next-line no-console
      console.log('[Login] Empleado no encontrado o sin acceso:', userEmail);
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso al portal. Contacta con el administrador si crees que esto es un error.',
      });
    }
    
    // eslint-disable-next-line no-console
    console.log('[Login] Empleado verificado:', {
      IdEmpleado: empleado.IdEmpleado,
      Email: empleado.Email,
      accesototal: empleado.accesototal,
      accesoLimitado: empleado.accesoLimitado,
    });

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
    
    const user = await authenticateUser(cleanUsername, password);
    // eslint-disable-next-line no-console
    console.log('[Login] Usuario autenticado:', user.username);

    // Verificar si el usuario tiene 2FA habilitado (usar username normalizado)
    const has2FA = is2FAEnabled(cleanUsername);
    const hasStoredSecret = hasSecret(cleanUsername);
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
      const userSecret = getSecret(cleanUsername);
      if (!userSecret || !verifyToken(userSecret.secret, twoFactorCode)) {
        return res.status(401).json({
          success: false,
          error: 'Código de autenticación de doble factor inválido',
        });
      }
      
      // Si el código es válido pero 2FA no estaba habilitado, habilitarlo ahora
      if (!has2FA) {
        // eslint-disable-next-line no-console
        console.log('[Login] Código válido, habilitando 2FA para usuario:', cleanUsername);
        await enable2FA(cleanUsername);
      }
    }

    // Generar token JWT (incluir IdEmpleado y tipo de acceso)
    const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_cambiar_en_produccion';
    const token = jwt.sign(
      { 
        username: user.username,
        email: user.email || userEmail,
        displayName: user.displayName,
        idEmpleado: empleado.IdEmpleado,
        accesototal: empleado.accesototal,
        accesoLimitado: empleado.accesoLimitado,
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
        email: user.email || userEmail,
        name: user.displayName || user.username,
        idEmpleado: empleado.IdEmpleado,
        accesototal: empleado.accesototal,
        accesoLimitado: empleado.accesoLimitado,
        // Incluir todos los datos del empleado por si hay campos adicionales
        empleado: empleado,
      },
    });
    // eslint-disable-next-line no-console
    console.log('[Login] Respuesta enviada');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Login] Error completo:', error);
    // eslint-disable-next-line no-console
    console.error('[Login] Error message:', error.message);
    // eslint-disable-next-line no-console
    console.error('[Login] Error stack:', error.stack);
    
    // Si es modo LDAP (no mock), incluir detalles técnicos para el equipo de backend
    const isLdapMode = !useMockAuth;
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
    };
    
    // Agregar información de configuración LDAP si está en modo LDAP
    if (isLdapMode) {
      errorDetails.ldapConfig = {
        ldapUrl: process.env.LDAP_URL ? 'Configurado' : 'No configurado',
        baseDN: process.env.LDAP_BASE_DN ? 'Configurado' : 'No configurado',
        adminDN: process.env.LDAP_ADMIN_DN ? 'Configurado' : 'No configurado',
        hasAdminPassword: !!process.env.LDAP_ADMIN_PASSWORD,
      };
      
      // Si hay un error específico de LDAP, agregar más detalles
      if (error.code) {
        errorDetails.ldapErrorCode = error.code;
      }
      if (error.dn) {
        errorDetails.attemptedDN = error.dn;
      }
    }
    
    // Errores de autenticación (credenciales inválidas)
    if (error.message && (
      error.message.includes('Credenciales inválidas') || 
      error.message.includes('Usuario no encontrado') ||
      error.message.includes('InvalidCredentialsError') ||
      error.code === 49
    )) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        ...(isLdapMode && { 
          details: errorDetails,
          // Información para el equipo de backend
          backendInfo: {
            errorType: 'LDAP Authentication Error',
            ldapErrorCode: error.code,
            ldapErrorMessage: error.message,
            attemptedUsername: cleanUsername,
            attemptedEmail: userEmail,
            ldapConfig: errorDetails.ldapConfig,
          }
        }),
      });
    }

    // Errores de conexión LDAP
    if (isLdapMode && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('getaddrinfo') ||
      error.message.includes('Error de autenticación admin LDAP') ||
      error.message.includes('Error de búsqueda LDAP')
    )) {
      return res.status(503).json({
        success: false,
        error: 'Error de conexión con el servidor de autenticación',
        details: errorDetails,
        backendInfo: {
          errorType: 'LDAP Connection Error',
          ldapErrorCode: error.code,
          ldapErrorMessage: error.message,
          ldapUrl: process.env.LDAP_URL,
          suggestion: 'Verificar que el servidor LDAP esté accesible, la URL sea correcta, y que estés conectado a la VPN si es necesario',
        },
      });
    }

    // Otros errores - devolver información detallada para debugging
    const statusCode = isLdapMode ? 500 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Error al autenticar usuario',
      details: errorDetails,
      ...(isLdapMode && {
        backendInfo: {
          errorType: 'LDAP General Error',
          ldapErrorCode: error.code,
          ldapErrorMessage: error.message,
          attemptedUsername: cleanUsername,
          attemptedEmail: userEmail,
          ldapConfig: errorDetails.ldapConfig,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }
      }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
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

    // Normalizar username igual que en el login
    // Si viene como email, extraer la parte antes del @
    let cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.includes('@')) {
      cleanUsername = cleanUsername.split('@')[0];
      // eslint-disable-next-line no-console
      console.log('[2FA Setup] Username viene como email, extrayendo:', cleanUsername);
    }
    
    // eslint-disable-next-line no-console
    console.log('[2FA Setup] Username normalizado:', cleanUsername);

    // Si se proporciona password, validar credenciales LDAP primero
    // Esto permite configurar 2FA antes del primer login
    if (password) {
      try {
        const user = await authenticateUser(cleanUsername, password);
        // eslint-disable-next-line no-console
        console.log('[2FA Setup] Credenciales LDAP validadas para:', user.username);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[2FA Setup] Error autenticando:', error.message);
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas. Debes proporcionar usuario y contraseña correctos para configurar 2FA.',
        });
      }
    }

    // Verificar si ya tiene 2FA habilitado o tiene un secreto guardado (usar username normalizado)
    if (is2FAEnabled(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: '2FA ya está configurado para este usuario. Si ya escaneaste el QR, simplemente ingresa el código de 6 dígitos de tu aplicación de autenticación.',
      });
    }
    
    // Si tiene un secreto guardado pero no está habilitado, sugerir usar el código existente
    if (hasSecret(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes un código 2FA configurado. Por favor, ingresa el código de 6 dígitos de tu aplicación de autenticación. Si no tienes acceso, contacta al administrador.',
      });
    }

    // Generar secreto (usar username normalizado)
    const { secret, otpauth_url } = generateSecret(cleanUsername);
    
    // Guardar secreto (aún no habilitado, usar username normalizado)
    await saveSecret(cleanUsername, secret);

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

    // Normalizar username igual que en el login
    // Si viene como email, extraer la parte antes del @
    let cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.includes('@')) {
      cleanUsername = cleanUsername.split('@')[0];
      // eslint-disable-next-line no-console
      console.log('[2FA Verify] Username viene como email, extrayendo:', cleanUsername);
    }
    
    // eslint-disable-next-line no-console
    console.log('[2FA Verify] Username normalizado:', cleanUsername);

    const userSecret = getSecret(cleanUsername);
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

    // Habilitar 2FA (usar username normalizado)
    await enable2FA(cleanUsername);

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

/**
 * GET /api/therefore/config-check
 * Endpoint de diagnóstico para verificar configuración de Therefore (SOLO DESARROLLO)
 */
if (process.env.NODE_ENV === 'development') {
  app.get('/api/therefore/config-check', async (req, res) => {
    const config = {
      THEREFORE_BASE_URL: process.env.THEREFORE_BASE_URL ? '✅ Configurado' : '❌ No configurado',
      THEREFORE_USERNAME: process.env.THEREFORE_USERNAME ? '✅ Configurado' : '❌ No configurado',
      THEREFORE_PASSWORD: process.env.THEREFORE_PASSWORD ? '✅ Configurado' : '❌ No configurado',
      THEREFORE_TENANT: process.env.THEREFORE_TENANT ? '✅ Configurado (opcional)' : '⚠️ No configurado (opcional)',
    };
    
    const allConfigured = process.env.THEREFORE_BASE_URL && 
                         process.env.THEREFORE_USERNAME && 
                         process.env.THEREFORE_PASSWORD;
    
    res.json({
      success: allConfigured,
      message: allConfigured 
        ? 'Todas las variables de Therefore están configuradas' 
        : 'Faltan variables de configuración de Therefore',
      config,
      instructions: !allConfigured ? {
        step1: 'Crea un archivo .env en la raíz del proyecto (si no existe)',
        step2: 'Copia el contenido de env.example.txt',
        step3: 'Configura las siguientes variables:',
        variables: {
          THEREFORE_BASE_URL: 'https://therefore.urovesa.com:443/theservice/v0001/restun',
          THEREFORE_USERNAME: 'tu_usuario_therefore',
          THEREFORE_PASSWORD: 'tu_contraseña_therefore',
          THEREFORE_TENANT: 'nombre_tenant (opcional)',
        },
        step4: 'Reinicia el servidor después de configurar',
      } : null,
    });
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[Server] Listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[Therefore Proxy] ${missing.length === 0 ? 'Enabled' : 'Disabled - Missing env vars'}`);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[Therefore Proxy] Missing: ${missing.join(', ')}`);
    // eslint-disable-next-line no-console
    console.log(`[Therefore Proxy] Visita http://localhost:${port}/api/therefore/config-check para ver instrucciones`);
  }
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



