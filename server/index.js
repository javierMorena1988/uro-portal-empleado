import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateSecret, generateQRCode, verifyToken } from './services/twoFactorService.js';
import { saveSecret, getSecret, is2FAEnabled, enable2FA, disable2FA, hasSecret } from './services/twoFactorStorage.js';
import { findEmpleadoByEmail } from './services/empleadosService.js';
import { sendPasswordEmail } from './services/emailService.js';

// Obtener el directorio actual del m�dulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde la ra�z del proyecto (un nivel arriba de server/)
dotenv.config({ path: join(__dirname, '..', '.env') });

// Usar mock o LDAP real seg�n configuraci�n
const useMockAuth = process.env.MOCK_AUTH === 'true';

// eslint-disable-next-line no-console
console.log('[Config] MOCK_AUTH value:', process.env.MOCK_AUTH);
// eslint-disable-next-line no-console
console.log('[Config] useMockAuth:', useMockAuth);

// Importar servicios
import * as mockAuthService from './services/mockAuthService.js';
import * as ldapAuthService from './services/ldapService.js';

// Seleccionar qu� servicio usar seg�n configuraci�n
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
let setPassword = authService.setPassword;

// Verificar que setPassword existe
if (!setPassword && typeof authService.setPassword === 'function') {
  setPassword = authService.setPassword;
}

// eslint-disable-next-line no-console
console.log('[Auth] authenticateUser type:', typeof authenticateUser);
// eslint-disable-next-line no-console
console.log('[Auth] changePassword type:', typeof changePassword);
// eslint-disable-next-line no-console
console.log('[Auth] setPassword type:', typeof setPassword);
// eslint-disable-next-line no-console
console.log('[Auth] authService keys:', Object.keys(authService));
// eslint-disable-next-line no-console
console.log('[Auth] authService.setPassword exists:', 'setPassword' in authService);
// eslint-disable-next-line no-console
console.log('[Auth] authService.setPassword type:', typeof authService.setPassword);

const app = express();
const port = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware para asegurar que todas las respuestas JSON usen UTF-8
app.use((req, res, next) => {
  // Guardar el método json original
  const originalJson = res.json.bind(res);
  
  // Sobrescribir res.json para incluir charset UTF-8
  res.json = function(body) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(body);
  };
  
  next();
});

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
// Obtiene documentos p�blicos para un empleado usando ExecuteSingleQuery
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

    // Construir la petici�n EXACTAMENTE como se proporcion�
    const requestBody = {
      FullText: '',
      Query: {
        CategoryNo: 64, // 74 para nominas
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
        SelectedFieldsNoOrNames: ['nombreDocumento', 'tipoDocumento', 'fechaArchivoDocumento'],
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
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] THEREFORE_BASE_URL:', base);
    
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error('[PublicDocuments] Error en fetch:', fetchError.message);
      // eslint-disable-next-line no-console
      console.error('[PublicDocuments] Error name:', fetchError.name);
      // eslint-disable-next-line no-console
      console.error('[PublicDocuments] Error code:', fetchError.code);
      // eslint-disable-next-line no-console
      console.error('[PublicDocuments] Error cause:', fetchError.cause);
      
      return res.status(500).json({ 
        success: false,
        error: `Error de conexi�n con Therefore: ${fetchError.message}`,
        details: process.env.NODE_ENV === 'development' ? {
          url,
          errorName: fetchError.name,
          errorCode: fetchError.code,
          errorCause: fetchError.cause,
        } : undefined
      });
    }
    
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
    console.log('[PublicDocuments] Documentos extra�dos:', documents.length);
    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Primer documento (ejemplo):', documents[0] || 'No hay documentos');
    
    // Si no encontramos documentos, devolver la estructura completa para debug
    if (documents.length === 0 && data) {
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] ?? No se encontraron documentos. Estructura de respuesta:', Object.keys(data));
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] Tipo de respuesta:', typeof data);
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] �Es array?', Array.isArray(data));
    }
    
    // Siempre incluir debug para ver qu� est� devolviendo Therefore
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
      error: err.message || 'Error al obtener documentos p�blicos',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/therefore/payrollDocuments
// Obtiene nóminas para un empleado usando ExecuteSingleQuery
// Body: { idEmpleado: string }
app.post('/api/therefore/payrollDocuments', async (req, res) => {
  try {
    const { idEmpleado } = req.body;

    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'idEmpleado es requerido',
      });
    }

    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      return res.status(500).json({
        success: false,
        error: 'THEREFORE_BASE_URL no configurado',
      });
    }

    const { THEREFORE_USERNAME, THEREFORE_PASSWORD } = process.env;
    if (!THEREFORE_USERNAME || !THEREFORE_PASSWORD) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Therefore no configuradas',
      });
    }

    const requestBody = {
      FullText: '',
      Query: {
        CategoryNo: 74, // Categoría de nóminas
        Conditions: [{
          Condition: String(idEmpleado),
          FieldNoOrName: 'idEmpleado',
          TimeZone: 0,
        }],
        FileByColName: '',
        FileByFieldNo: 0,
        MaxRows: 100,
        Mode: 0,
        OrderByFieldsNoOrNames: [],
        RowBlockSize: 100,
        SelectedFieldsNoOrNames: ['nombreDocumento', 'tipoDocumento', 'fechaArchivoDocumento'],
        GroupByFieldsNoOrNames: [],
        IsPersonalQuery: false,
        QueryNo: 2147483647,
        FullText: '',
      },
    };

    const url = joinUrl(base, 'ExecuteSingleQuery');
    const resp = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => 'Error desconocido');
      return res.status(resp.status).json({
        success: false,
        error: errorText,
        status: resp.status,
      });
    }

    const data = await resp.json().catch(() => null);

    let documents = [];
    if (data && data.QueryResult && data.QueryResult.ResultRows && Array.isArray(data.QueryResult.ResultRows)) {
      documents = data.QueryResult.ResultRows;
    } else if (data && Array.isArray(data)) {
      documents = data;
    } else if (data && data.Results && Array.isArray(data.Results)) {
      documents = data.Results;
    } else if (data && data.Documents && Array.isArray(data.Documents)) {
      documents = data.Documents;
    } else if (data && data.Query && data.Query.Results && Array.isArray(data.Query.Results)) {
      documents = data.Query.Results;
    } else if (data && typeof data === 'object') {
      for (const key in data) {
        if (Array.isArray(data[key])) {
          documents = data[key];
          break;
        }
      }
    }

    return res.json({
      success: true,
      documents,
      debug: process.env.NODE_ENV === 'development' ? {
        rawResponse: data,
      } : undefined,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al consultar nóminas en Therefore',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
        error: 'DocNo es requerido en el body de la petici�n'
      });
    }
    
    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      // eslint-disable-next-line no-console
      console.error('[Therefore] THEREFORE_BASE_URL no est� configurado');
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
    console.log('[Therefore] Consultando documento:', DocNo, VersionNo ? `versi�n ${VersionNo}` : '(�ltima versi�n)');
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
        error: 'DocNo es requerido en el body de la petici�n'
      });
    }
    
    const base = process.env.THEREFORE_BASE_URL;
    if (!base) {
      // eslint-disable-next-line no-console
      console.error('[Therefore] THEREFORE_BASE_URL no est� configurado');
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

    // Construir el body para Therefore seg�n la documentaci�n
    // https://therefore.net/help/2024/en-us/AR/SDK/WebAPI/the_webapi_operation_getdocument.html
    const requestBody = { 
      DocNo,
      IsStreamsInfoAndDataNeeded: true, // Necesario para obtener el contenido del archivo
      IsStreamDataBase64JSONNeeded: true // Para obtener stream data como Base64 string en JSON
    };
    if (VersionNo !== undefined) {
      requestBody.VersionNo = VersionNo;
    } else {
      requestBody.VersionNo = 0; // 0 = �ltima versi�n seg�n la documentaci�n
    }

    // Usar GetDocument directamente como me indicaron
    const url = joinUrl(base, 'GetDocument');
    // eslint-disable-next-line no-console
    console.log('[Therefore] Descargando documento:', DocNo, VersionNo ? `versi�n ${VersionNo}` : '(�ltima versi�n)');
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
      // Verificar si es error de autenticaci�n
      let errorText = await resp.text().catch(() => 'Error desconocido');
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.WSError && errorJson.WSError.ErrorCodeString === 'InvalidLogin') {
          // eslint-disable-next-line no-console
          console.error('[Therefore] Error de autenticaci�n con GetDocument');
          return res.status(401).json({ 
            message: 'Error de autenticaci�n con Therefore',
            error: 'Credenciales inv�lidas. Verifica THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env',
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
    
    // GetDocument siempre devuelve JSON seg�n la documentaci�n
    const docData = await resp.json().catch(() => null);
    
    if (!docData) {
      return res.status(500).json({ 
        message: 'DownloadDocument failed',
        error: 'No se pudo parsear la respuesta de Therefore'
      });
    }
    
    // eslint-disable-next-line no-console
    console.log('[Therefore] GetDocument devolvi� JSON');
    
    // Seg�n la documentaci�n, los streams est�n en StreamsInfo
    // https://therefore.net/help/2024/en-us/AR/SDK/WebAPI/the_webapi_operation_getdocument.html
    if (docData.StreamsInfo && docData.StreamsInfo.length > 0) {
      const stream = docData.StreamsInfo[0]; // Tomar el primer stream
      
      // Intentar obtener los datos del stream
      let streamData = null;
      let filename = stream.FileName || `document_${DocNo}.pdf`;
      
      // Preferir StreamDataBase64JSON si est� disponible (m�s f�cil de manejar en JSON)
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
        // Determinar el tipo de contenido basado en la extensi�n del archivo
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
        // Codificar el nombre de archivo para UTF-8 (RFC 5987)
        const encodedFilename = encodeURIComponent(filename);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Length', streamData.length);
        return res.send(streamData);
      }
    }
    
    // Si no hay streams o no se pudo extraer el contenido
    // eslint-disable-next-line no-console
    console.warn('[Therefore] No se encontr� contenido del stream en la respuesta');
    return res.status(500).json({ 
      message: 'DownloadDocument failed',
      error: 'No se encontr� contenido del documento en la respuesta',
      details: 'El documento puede no tener streams o los datos no est�n disponibles'
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
 * Obtiene informaci�n del diccionario de Therefore (descripciones de tipos de documento)
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
    // eslint-disable-next-line no-console
    console.log('[GetDictionaryInfo] THEREFORE_BASE_URL:', base);
    
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error('[GetDictionaryInfo] Error en fetch:', fetchError.message);
      // eslint-disable-next-line no-console
      console.error('[GetDictionaryInfo] Error name:', fetchError.name);
      // eslint-disable-next-line no-console
      console.error('[GetDictionaryInfo] Error code:', fetchError.code);
      // eslint-disable-next-line no-console
      console.error('[GetDictionaryInfo] Error cause:', fetchError.cause);
      
      return res.status(500).json({ 
        success: false,
        error: `Error de conexi�n con Therefore: ${fetchError.message}`,
        details: process.env.NODE_ENV === 'development' ? {
          url,
          errorName: fetchError.name,
          errorCode: fetchError.code,
          errorCause: fetchError.cause,
        } : undefined
      });
    }
    
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
      error: err.message || 'Error al obtener informaci�n del diccionario',
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
      message: 'Endpoint de debug - revisa la consola del servidor para m�s detalles',
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
        error: 'Usuario y contrase�a son requeridos' 
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

    // PASO 1: Verificar que el email est� en la lista de empleados con acceso
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
      console.error('[Login] ERROR: authenticateUser no est� definido!');
      return res.status(500).json({
        success: false,
        error: 'Error de configuraci�n del servidor',
        details: 'authenticateUser no est� definido',
      });
    }
    
    const user = await authenticateUser(cleanUsername, password);
    // eslint-disable-next-line no-console
    console.log('[Login] Usuario autenticado:', user.username);

    // PRIMERO: si debe cambiar contraseña (primer acceso o tras reset), obligar antes de 2FA
    // Así el flujo es: 1) Cambiar contraseña  2) En el siguiente login, configurar 2FA
    if (user && user.mustChangePassword === true) {
      // eslint-disable-next-line no-console
      console.log('[Login] Usuario debe cambiar contraseña (primer acceso), redirigiendo sin pedir 2FA');
      return res.status(200).json({
        success: false,
        mustChangePassword: true,
        username: cleanUsername,
        message: 'Debes cambiar tu contraseña en el primer acceso.',
      });
    }

    // Verificar si el usuario tiene 2FA habilitado (usar username normalizado)
    const has2FA = is2FAEnabled(cleanUsername);
    const hasStoredSecret = hasSecret(cleanUsername);
    // eslint-disable-next-line no-console
    console.log('[Login] Usuario tiene 2FA habilitado:', has2FA, 'Tiene secreto guardado:', hasStoredSecret);
    
    // Si tiene un secreto guardado (incluso si no est� habilitado), primero intentar con c�digo
    // Esto permite que usuarios que ya escanearon el QR puedan usar el c�digo sin reconfigurar
    if (hasStoredSecret && !twoFactorCode) {
      // eslint-disable-next-line no-console
      console.log('[Login] Usuario tiene secreto guardado, requiere c�digo 2FA');
      return res.status(200).json({
        success: false,
        requiresTwoFactor: true,
        message: 'Se requiere c�digo de autenticaci�n de doble factor',
      });
    }

    // Si no tiene secreto guardado, debe configurarlo primero
    if (!hasStoredSecret) {
      return res.status(403).json({
        success: false,
        requires2FASetup: true,
        error: 'Debes configurar la autenticaci�n de doble factor antes de poder iniciar sesi�n. Por favor, contacta con el administrador o configura 2FA desde tu perfil.',
        message: '2FA no configurado. Debe configurarse antes del primer acceso.',
      });
    }
    
    // Si tiene 2FA habilitado pero no tiene c�digo, pedirlo
    if (has2FA && !twoFactorCode) {
      // eslint-disable-next-line no-console
      console.log('[Login] Requiere c�digo 2FA');
      return res.status(200).json({
        success: false,
        requiresTwoFactor: true,
        message: 'Se requiere c�digo de autenticaci�n de doble factor',
      });
    }

    // Si tiene c�digo, verificar el c�digo 2FA
    if (twoFactorCode) {
      const userSecret = getSecret(cleanUsername);
      if (!userSecret || !verifyToken(userSecret.secret, twoFactorCode)) {
        return res.status(401).json({
          success: false,
          error: 'C�digo de autenticaci�n de doble factor inv�lido',
        });
      }
      
      // Si el c�digo es v�lido pero 2FA no estaba habilitado, habilitarlo ahora
      if (!has2FA) {
        // eslint-disable-next-line no-console
        console.log('[Login] C�digo v�lido, habilitando 2FA para usuario:', cleanUsername);
        await enable2FA(cleanUsername);
      }
    }

    // Obtener el nombre del empleado (priorizar EMPLEADO del objeto empleado sobre displayName del usuario)
    const nombreEmpleado = empleado.EMPLEADO || empleado.empleado || empleado.Nombre || empleado.nombre || empleado.NOMBRE || user.displayName || user.username;

    // Generar token JWT (incluir IdEmpleado y tipo de acceso)
    const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_cambiar_en_produccion';
    const token = jwt.sign(
      { 
        username: user.username,
        email: user.email || userEmail,
        displayName: nombreEmpleado,
        idEmpleado: empleado.IdEmpleado,
        accesototal: empleado.accesototal,
        accesoLimitado: empleado.accesoLimitado,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // eslint-disable-next-line no-console
    console.log('[Login] Login exitoso, generando token...');
    // eslint-disable-next-line no-console
    console.log('[Login] Nombre del empleado usado:', nombreEmpleado);
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        email: user.email || userEmail,
        name: nombreEmpleado, // Usar el nombre del empleado en lugar de displayName
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
    
    // Si es modo LDAP (no mock), incluir detalles t�cnicos para el equipo de backend
    const isLdapMode = !useMockAuth;
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
    };
    
    // Agregar informaci�n de configuraci�n LDAP si est� en modo LDAP
    if (isLdapMode) {
      errorDetails.ldapConfig = {
        ldapUrl: process.env.LDAP_URL ? 'Configurado' : 'No configurado',
        baseDN: process.env.LDAP_BASE_DN ? 'Configurado' : 'No configurado',
        adminDN: process.env.LDAP_ADMIN_DN ? 'Configurado' : 'No configurado',
        hasAdminPassword: !!process.env.LDAP_ADMIN_PASSWORD,
      };
      
      // Si hay un error espec�fico de LDAP, agregar m�s detalles
      if (error.code) {
        errorDetails.ldapErrorCode = error.code;
      }
      if (error.dn) {
        errorDetails.attemptedDN = error.dn;
      }
    }
    
    // Errores de autenticaci�n (credenciales inv�lidas)
    if (error.message && (
      error.message.includes('Credenciales inv�lidas') || 
      error.message.includes('Usuario no encontrado') ||
      error.message.includes('InvalidCredentialsError') ||
      error.code === 49
    )) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inv�lidas',
        ...(isLdapMode && { 
          details: errorDetails,
          // Informaci�n para el equipo de backend
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

    // Errores de conexi�n LDAP
    if (isLdapMode && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('getaddrinfo') ||
      error.message.includes('Error de autenticaci�n admin LDAP') ||
      error.message.includes('Error de b�squeda LDAP')
    )) {
      return res.status(503).json({
        success: false,
        error: 'Error de conexi�n con el servidor de autenticaci�n',
        details: errorDetails,
        backendInfo: {
          errorType: 'LDAP Connection Error',
          ldapErrorCode: error.code,
          ldapErrorMessage: error.message,
          ldapUrl: process.env.LDAP_URL,
          suggestion: 'Verificar que el servidor LDAP est� accesible, la URL sea correcta, y que est�s conectado a la VPN si es necesario',
        },
      });
    }

    // Otros errores - devolver informaci�n detallada para debugging
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
 * POST /api/auth/register
 * Registra un nuevo usuario y le envía la contraseña por correo
 * Body: { email: string }
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'El email es requerido',
      });
    }

    // Normalizar email
    const userEmail = String(email).trim().toLowerCase();
    
    // eslint-disable-next-line no-console
    console.log('[Register] Intentando registro para:', userEmail);

    // PASO 1: Verificar que el email esté en la lista de empleados con acceso
    // eslint-disable-next-line no-console
    console.log('[Register] Verificando acceso del empleado...');
    const empleado = await findEmpleadoByEmail(userEmail);
    
    if (!empleado) {
      // eslint-disable-next-line no-console
      console.log('[Register] Empleado no encontrado o sin acceso:', userEmail);
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso al portal. Contacta con el administrador si crees que esto es un error.',
      });
    }

    // eslint-disable-next-line no-console
    console.log('[Register] Empleado verificado:', {
      IdEmpleado: empleado.IdEmpleado,
      Email: empleado.Email,
    });

    // PASO 2: Extraer username del email
    let username = userEmail.split('@')[0];
    
    // eslint-disable-next-line no-console
    console.log('[Register] Username extraído:', username);

    // PASO 3: Verificar si el usuario ya tiene contraseña
    // Intentar autenticar con una contraseña dummy para verificar si el usuario existe
    try {
      await authenticateUser(username, 'dummy_password_check_12345');
      // Si no falla, algo está mal
      // eslint-disable-next-line no-console
      console.warn('[Register] Usuario autenticado con contraseña dummy (inesperado)');
    } catch (authError) {
      // Si el error es "Usuario no encontrado", podemos crear la cuenta
      if (authError.message.includes('no encontrado') || authError.message.includes('not found')) {
        // Usuario no existe, podemos continuar
        // eslint-disable-next-line no-console
        console.log('[Register] Usuario no existe en el sistema, procediendo con registro');
      } else if (authError.message.includes('Credenciales inválidas') || authError.message.includes('InvalidCredentials')) {
        // Usuario existe y tiene contraseña
        // eslint-disable-next-line no-console
        console.log('[Register] Usuario ya tiene contraseña configurada');
        return res.status(400).json({
          success: false,
          error: 'Este usuario ya tiene una contraseña configurada. Si la has olvidado, contacta con el administrador.',
        });
      } else {
        // Otro error, continuar de todas formas
        // eslint-disable-next-line no-console
        console.log('[Register] Error al verificar usuario existente:', authError.message, '- Continuando con registro');
      }
    }

    // PASO 4: Generar contraseña temporal segura
    const generatePassword = () => {
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
    };

    const temporaryPassword = generatePassword();
    
    // eslint-disable-next-line no-console
    console.log('[Register] Contraseña temporal generada');
    // ⚠️ LOG TEMPORAL: Mostrar contraseña en logs (SOLO PARA DEBUGGING - ELIMINAR DESPUÉS)
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('⚠️ [REGISTRO] CONTRASEÑA GENERADA:');
    // eslint-disable-next-line no-console
    console.log(`   Email: ${userEmail}`);
    // eslint-disable-next-line no-console
    console.log(`   Username: ${username}`);
    // eslint-disable-next-line no-console
    console.log(`   Contraseña: ${temporaryPassword}`);
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');

    // PASO 5: Establecer la contraseña en el sistema (LDAP o Mock)
    // Verificar setPassword desde authService directamente si no está definido
    const setPasswordFn = setPassword || authService.setPassword;
    
    if (!setPasswordFn || typeof setPasswordFn !== 'function') {
      // eslint-disable-next-line no-console
      console.error('[Register] ERROR: setPassword no está definido!');
      // eslint-disable-next-line no-console
      console.error('[Register] authService:', authService);
      // eslint-disable-next-line no-console
      console.error('[Register] authService.setPassword:', authService.setPassword);
      return res.status(500).json({
        success: false,
        error: 'Error de configuración del servidor',
        details: 'setPassword no está definido',
      });
    }

    try {
      // Obtener nombre del empleado si está disponible
      const displayName = empleado.EMPLEADO || empleado.NOMBRE || empleado.Email || username;
      
      if (useMockAuth) {
        // En modo mock, pasar email y displayName
        await setPasswordFn(username, temporaryPassword, userEmail, displayName);
      } else {
        // En modo LDAP, solo pasar username y password
        await setPasswordFn(username, temporaryPassword);
      }
      
      // eslint-disable-next-line no-console
      console.log('[Register] Contraseña establecida en el sistema');
    } catch (setPasswordError) {
      // eslint-disable-next-line no-console
      console.error('[Register] Error al establecer contraseña:', setPasswordError.message);
      return res.status(500).json({
        success: false,
        error: `Error al establecer contraseña: ${setPasswordError.message}`,
      });
    }

    // PASO 6: Enviar correo con la contraseña
    try {
      await sendPasswordEmail(userEmail, username, temporaryPassword);
      // eslint-disable-next-line no-console
      console.log('[Register] Correo enviado exitosamente a:', userEmail);
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error('[Register] Error al enviar correo:', emailError.message);
      // ⚠️ LOG TEMPORAL: Mostrar contraseña en logs cuando falla el correo (SOLO PARA DEBUGGING)
      // eslint-disable-next-line no-console
      console.log('═══════════════════════════════════════════════════════════');
      // eslint-disable-next-line no-console
      console.log('⚠️ [REGISTRO] CONTRASEÑA GENERADA (correo falló):');
      // eslint-disable-next-line no-console
      console.log(`   Email: ${userEmail}`);
      // eslint-disable-next-line no-console
      console.log(`   Username: ${username}`);
      // eslint-disable-next-line no-console
      console.log(`   Contraseña: ${temporaryPassword}`);
      // eslint-disable-next-line no-console
      console.log('═══════════════════════════════════════════════════════════');
      
      // En desarrollo, devolver la contraseña en la respuesta si falla el correo
      // En producción, solo devolver el error
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
          success: false,
          error: `Error al enviar correo: ${emailError.message}`,
          warning: 'La contraseña se estableció correctamente pero no se pudo enviar el correo.',
          // Solo en desarrollo, devolver la contraseña para pruebas
          development: {
            password: temporaryPassword,
            message: '⚠️ MODO DESARROLLO: La contraseña se muestra aquí porque falló el envío de correo',
          },
        });
      }
      
      // En producción, no devolver la contraseña por seguridad
      return res.status(500).json({
        success: false,
        error: `La contraseña se estableció correctamente, pero hubo un error al enviar el correo. Contacta con el administrador para obtener tu contraseña.`,
        details: 'Error SMTP: ' + emailError.message,
      });
    }

    // PASO 7: Respuesta exitosa
    res.json({
      success: true,
      message: 'Registro completado. Se ha enviado tu contraseña a tu correo electrónico.',
      email: userEmail, // No devolver la contraseña por seguridad
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Register] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al procesar el registro',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

/**
 * POST /api/auth/change-password
 * Cambia la contrase�a de un usuario en LDAP/Active Directory
 * Body: { username: string, oldPassword: string, newPassword: string }
 */
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Usuario, contrase�a actual y nueva contrase�a son requeridos',
      });
    }

    // Validar longitud m�nima de contrase�a
    const minLength = parseInt(process.env.LDAP_PASSWORD_MIN_LENGTH || '8', 10);
    if (newPassword.length < minLength) {
      return res.status(400).json({
        success: false,
        error: `La contrase�a debe tener al menos ${minLength} caracteres`,
      });
    }

    // Cambiar contrase�a en LDAP
    await changePassword(username, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Contrase�a cambiada correctamente',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[LDAP Change Password] Error:', error.message);

    // Errores de autenticaci�n
    if (error.message.includes('contrase�a actual es incorrecta')) {
      return res.status(401).json({
        success: false,
        error: 'La contrase�a actual es incorrecta',
      });
    }

    // Errores de pol�ticas de contrase�a
    if (error.message.includes('pol�ticas de seguridad') || 
        error.message.includes('requisitos de complejidad')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    // Otros errores
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contrase�a',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/auth/verify
 * Verifica un token JWT (opcional, para validar sesi�n)
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
      error: 'Token inv�lido o expirado',
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
          error: 'Credenciales inv�lidas. Debes proporcionar usuario y contrase�a correctos para configurar 2FA.',
        });
      }
    }

    // Verificar si ya tiene 2FA habilitado o tiene un secreto guardado (usar username normalizado)
    if (is2FAEnabled(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: '2FA ya est� configurado para este usuario. Si ya escaneaste el QR, simplemente ingresa el c�digo de 6 d�gitos de tu aplicaci�n de autenticaci�n.',
      });
    }
    
    // Si tiene un secreto guardado pero no est� habilitado, sugerir usar el c�digo existente
    if (hasSecret(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes un c�digo 2FA configurado. Por favor, ingresa el c�digo de 6 d�gitos de tu aplicaci�n de autenticaci�n. Si no tienes acceso, contacta al administrador.',
      });
    }

    // Generar secreto (usar username normalizado)
    const { secret, otpauth_url } = generateSecret(cleanUsername);
    
    // Guardar secreto (a�n no habilitado, usar username normalizado)
    await saveSecret(cleanUsername, secret);

    // Generar QR code
    const qrCode = await generateQRCode(otpauth_url);

    res.json({
      success: true,
      secret, // Solo para desarrollo, en producci�n no enviar
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
 * Verifica un c�digo 2FA y habilita 2FA para el usuario
 * Body: { username: string, code: string }
 */
app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y c�digo requeridos',
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

    // Verificar c�digo
    if (!verifyToken(userSecret.secret, code)) {
      return res.status(401).json({
        success: false,
        error: 'C�digo inv�lido',
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
      error: 'Error al verificar c�digo 2FA',
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
 * Endpoint de diagn�stico para verificar configuraci�n de Therefore (SOLO DESARROLLO)
 */
if (process.env.NODE_ENV === 'development') {
  app.get('/api/therefore/config-check', async (req, res) => {
    const config = {
      THEREFORE_BASE_URL: process.env.THEREFORE_BASE_URL ? '? Configurado' : '? No configurado',
      THEREFORE_USERNAME: process.env.THEREFORE_USERNAME ? '? Configurado' : '? No configurado',
      THEREFORE_PASSWORD: process.env.THEREFORE_PASSWORD ? '? Configurado' : '? No configurado',
      THEREFORE_TENANT: process.env.THEREFORE_TENANT ? '? Configurado (opcional)' : '?? No configurado (opcional)',
    };
    
    const allConfigured = process.env.THEREFORE_BASE_URL && 
                         process.env.THEREFORE_USERNAME && 
                         process.env.THEREFORE_PASSWORD;
    
    res.json({
      success: allConfigured,
      message: allConfigured 
        ? 'Todas las variables de Therefore est�n configuradas' 
        : 'Faltan variables de configuraci�n de Therefore',
      config,
      instructions: !allConfigured ? {
        step1: 'Crea un archivo .env en la ra�z del proyecto (si no existe)',
        step2: 'Copia el contenido de env.example.txt',
        step3: 'Configura las siguientes variables:',
        variables: {
          THEREFORE_BASE_URL: 'https://therefore.urovesa.com:443/theservice/v0001/restun',
          THEREFORE_USERNAME: 'tu_usuario_therefore',
          THEREFORE_PASSWORD: 'tu_contrase�a_therefore',
          THEREFORE_TENANT: 'nombre_tenant (opcional)',
        },
        step4: 'Reinicia el servidor despu�s de configurar',
      } : null,
    });
  });
}

// ==================== ENDPOINTS ADMINISTRACIÓN ====================

/**
 * Middleware para verificar que el usuario es el administrador específico
 * Solo permite acceso a javiermorenavideo@gmail.com
 */
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_cambiar_en_produccion';
    
    const decoded = jwt.verify(token, jwtSecret);
    
    // Verificar que sea el email específico del administrador
    const adminEmail = 'javier.morena@inforges.es';
    const userEmail = decoded.email || decoded.user?.email || decoded.empleado?.Email;
    
    if (userEmail?.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        error: 'No tienes permisos de administrador' 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
    });
  }
};

/**
 * GET /api/admin/users
 * Lista todos los usuarios con contraseña asignada (solo admin)
 */
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    if (useMockAuth) {
      // En modo MOCK, mostrar todos los usuarios que tienen contraseña
      const { getAllMockUsers } = await import('./services/mockAuthService.js');
      const users = getAllMockUsers();
      res.json({
        success: true,
        users,
        total: users.length,
        mode: 'mock',
      });
    } else {
      // En modo LDAP, obtener lista de empleados y verificar cuáles tienen contraseña
      const { getEmpleadosList } = await import('./services/empleadosService.js');
      const { searchUser } = await import('./services/ldapService.js');
      
      const empleados = await getEmpleadosList();
      
      // Para cada empleado, verificar si tiene contraseña (existe en LDAP)
      const usersWithPassword = [];
      
      for (const empleado of empleados) {
        const email = empleado.EMAILPERSONAL || empleado.emailPersonal || empleado.Email || empleado.email;
        if (!email) continue;
        
        // Extraer username del email
        const username = email.split('@')[0];
        
        try {
          // Intentar buscar el usuario en LDAP (si existe, tiene cuenta)
          const ldapUser = await searchUser(username);
          if (ldapUser) {
            usersWithPassword.push({
              username,
              email,
              displayName: empleado.EMPLEADO || empleado.empleado || empleado.NOMBRE || empleado.nombre || username,
            });
          }
        } catch (error) {
          // Si hay error al buscar, el usuario probablemente no existe en LDAP
          // No agregarlo a la lista
        }
      }
      
      res.json({
        success: true,
        users: usersWithPassword,
        total: usersWithPassword.length,
        mode: 'ldap',
        message: `Mostrando ${usersWithPassword.length} usuarios con contraseña asignada de ${empleados.length} empleados totales`,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Admin] Error al listar usuarios:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al listar usuarios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/users/:username
 * Obtiene información de un usuario específico (solo admin)
 */
app.get('/api/admin/users/:username', requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;

    if (useMockAuth) {
      const { getMockUser } = await import('./services/mockAuthService.js');
      const user = getMockUser(username);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      res.json({
        success: true,
        user,
      });
    } else {
      // En modo LDAP, buscar el usuario
      const { searchUser } = await import('./services/ldapService.js');
      const user = await searchUser(username);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado en LDAP',
        });
      }

      res.json({
        success: true,
        user: {
          username: user.sAMAccountName || username,
          email: user.mail || user.userPrincipalName,
          displayName: user.displayName || user.cn,
          dn: user.dn,
        },
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Admin] Error al obtener usuario:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información del usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/admin/users/:username/password
 * Cambia la contraseña de un usuario (solo admin, sin necesidad de contraseña antigua)
 * Body: { newPassword: string }
 */
app.put('/api/admin/users/:username/password', requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña es requerida',
      });
    }

    // Validar longitud mínima
    const minLength = parseInt(process.env.LDAP_PASSWORD_MIN_LENGTH || '8', 10);
    if (newPassword.length < minLength) {
      return res.status(400).json({
        success: false,
        error: `La contraseña debe tener al menos ${minLength} caracteres`,
      });
    }

    if (useMockAuth) {
      const { adminChangePassword } = await import('./services/mockAuthService.js');
      await adminChangePassword(username, newPassword);
    } else {
      const { adminChangePassword } = await import('./services/ldapService.js');
      await adminChangePassword(username, newPassword);
    }

    res.json({
      success: true,
      message: 'Contraseña cambiada correctamente',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Admin] Error al cambiar contraseña:', error.message);

    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message.includes('políticas de seguridad') || 
        error.message.includes('requisitos de complejidad')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/users/:username/reset-password
 * Resetea la contraseña de un usuario y la envía por email (solo admin)
 * Body: { sendEmail?: boolean } - Por defecto true
 */
app.post('/api/admin/users/:username/reset-password', requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { sendEmail = true } = req.body;

    // Generar contraseña temporal segura
    const generatePassword = () => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
      for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    const temporaryPassword = generatePassword();

    // Obtener información del usuario para el email
    let userEmail = null;
    let displayName = username;

    if (useMockAuth) {
      const { getMockUser, adminChangePassword } = await import('./services/mockAuthService.js');
      const user = getMockUser(username);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      userEmail = user.email;
      displayName = user.displayName || username;
      await adminChangePassword(username, temporaryPassword);
    } else {
      const { searchUser, adminChangePassword } = await import('./services/ldapService.js');
      const { findEmpleadoByEmail } = await import('./services/empleadosService.js');
      
      // Primero intentar buscar en LDAP
      let user = null;
      try {
        user = await searchUser(username);
      } catch (error) {
        // Si no existe en LDAP, intentar obtener email de la lista de empleados
        // y crear el usuario con la contraseña
        // eslint-disable-next-line no-console
        console.log('[Admin] Usuario no encontrado en LDAP, buscando en lista de empleados...');
      }
      
      if (user) {
        // Usuario existe en LDAP
        userEmail = user.mail || user.userPrincipalName;
        displayName = user.displayName || user.cn || username;
        await adminChangePassword(username, temporaryPassword);
      } else {
        // Usuario no existe en LDAP, buscar email en lista de empleados
        // Construir email probable: username@inforges.es
        const probableEmail = `${username}@inforges.es`;
        const empleado = await findEmpleadoByEmail(probableEmail);
        
        if (!empleado) {
          return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado. El usuario debe estar en la lista de empleados.',
          });
        }
        
        userEmail = empleado.Email || probableEmail;
        displayName = empleado.EMPLEADO || empleado.empleado || empleado.NOMBRE || username;
        
        // Establecer la contraseña (esto creará el usuario si no existe en modo MOCK)
        // En LDAP, necesitaríamos crear el usuario primero, pero por ahora solo establecemos la contraseña
        try {
          await adminChangePassword(username, temporaryPassword);
        } catch (setPasswordError) {
          // Si falla, puede ser que el usuario no exista en LDAP
          // En ese caso, el usuario debe registrarse primero
          return res.status(400).json({
            success: false,
            error: 'El usuario no tiene cuenta en el sistema. Debe registrarse primero usando el formulario de registro.',
          });
        }
      }
    }

    // Enviar correo si está habilitado
    if (sendEmail && userEmail) {
      try {
        await sendPasswordEmail(userEmail, username, temporaryPassword);
        // eslint-disable-next-line no-console
        console.log('[Admin] Contraseña reseteada y correo enviado a:', userEmail);
      } catch (emailError) {
        // eslint-disable-next-line no-console
        console.error('[Admin] Error al enviar correo:', emailError.message);
        // Aún así devolver éxito pero con advertencia
        return res.json({
          success: true,
          message: 'Contraseña reseteada correctamente, pero hubo un error al enviar el correo',
          password: temporaryPassword, // Devolver la contraseña para que el admin la pueda compartir manualmente
          warning: 'El correo no se pudo enviar. Comparte esta contraseña manualmente con el usuario.',
        });
      }
    }

    res.json({
      success: true,
      message: sendEmail && userEmail 
        ? 'Contraseña reseteada y enviada por correo correctamente'
        : 'Contraseña reseteada correctamente',
      password: sendEmail ? undefined : temporaryPassword, // Solo mostrar si no se envió por correo
      email: userEmail,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Admin] Error al resetear contraseña:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al resetear la contraseña',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/admin/users/:username
 * Elimina un usuario (solo admin, solo en modo MOCK).
 * También elimina usuarios recién registrados. Limpia datos 2FA del usuario.
 */
app.delete('/api/admin/users/:username', requireAdmin, async (req, res) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no válido',
      });
    }

    if (!useMockAuth) {
      return res.status(400).json({
        success: false,
        error: 'La eliminación de usuarios solo está disponible en modo MOCK. En LDAP, usa las herramientas de administración de Active Directory.',
      });
    }

    const { deleteMockUser } = await import('./services/mockAuthService.js');
    const deleted = await deleteMockUser(username);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      });
    }

    // Limpiar secretos 2FA del usuario eliminado
    try {
      await disable2FA(username);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Admin] No se pudo limpiar 2FA del usuario eliminado:', err.message);
    }

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Admin] Error al eliminar usuario:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

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



