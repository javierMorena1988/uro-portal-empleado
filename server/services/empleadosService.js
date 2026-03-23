/**
 * Servicio para obtener la lista de empleados con acceso al portal
 * 
 * Llama al endpoint externo "devuelve_datos" con "consulta=empleados"
 * para obtener la lista de empleados con sus permisos de acceso.
 */

/**
 * Obtiene la lista de empleados con acceso al portal
 * @returns {Promise<Array>} Lista de empleados con IdEmpleado, Email, accesototal, acceso limitado
 */
export async function getEmpleadosList() {
  const empleadosApiUrl = process.env.EMPLEADOS_API_URL;
  
  if (!empleadosApiUrl) {
    // eslint-disable-next-line no-console
    console.warn('[Empleados] EMPLEADOS_API_URL no configurado, usando lista vacía');
    return [];
  }

  try {
    // Construir URL - puede que ya tenga el parámetro consulta=empleados en la URL
    let url;
    if (empleadosApiUrl.includes('consulta=')) {
      // Si ya tiene el parámetro, usar la URL tal cual
      url = new URL(empleadosApiUrl);
    } else {
      // Si no tiene el parámetro, agregarlo
      url = new URL(empleadosApiUrl);
      url.searchParams.set('consulta', 'empleados');
    }
    
    // Construir headers con API Key
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Usar API Key para autenticación
    const apiKey = process.env.EMPLEADOS_API_KEY;
    if (apiKey) {
      headers['ApiKey'] = apiKey;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Usando API Key para autenticación');
    } else {
      // eslint-disable-next-line no-console
      console.warn('[Empleados] EMPLEADOS_API_KEY no configurado, llamada sin autenticación');
    }
    
    // eslint-disable-next-line no-console
    console.log('[Empleados] Consultando lista de empleados:', url.toString());
    // eslint-disable-next-line no-console
    console.log('[Empleados] Headers enviados:', JSON.stringify(headers, null, 2));
    
    let response;
    try {
      // Para Node.js, fetch puede necesitar configuración adicional para SSL
      // Intentar con opciones que permitan certificados autofirmados en desarrollo
      const fetchOptions = {
        method: 'GET',
        headers,
      };
      
      // En desarrollo, permitir certificados no verificados si es necesario
      // (solo para debugging, NO usar en producción)
      if (process.env.NODE_ENV === 'development' && process.env.EMPLEADOS_IGNORE_SSL === 'true') {
        // eslint-disable-next-line no-console
        console.warn('[Empleados] ADVERTENCIA: Ignorando verificación SSL (solo desarrollo)');
        // Node.js fetch no tiene rejectUnauthorized directamente, pero podemos usar agent
        // Por ahora, solo logueamos la advertencia
      }
      
      response = await fetch(url.toString(), fetchOptions);
      
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta status:', response.status);
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta headers:', Object.fromEntries(response.headers.entries()));
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error('[Empleados] Error en fetch:', fetchError.message);
      // eslint-disable-next-line no-console
      console.error('[Empleados] Error name:', fetchError.name);
      // eslint-disable-next-line no-console
      console.error('[Empleados] Error code:', fetchError.code);
      // eslint-disable-next-line no-console
      console.error('[Empleados] Error cause:', fetchError.cause);
      // eslint-disable-next-line no-console
      console.error('[Empleados] Stack:', fetchError.stack);
      throw new Error(`Error de conexión con la API de empleados: ${fetchError.message} (${fetchError.code || fetchError.name})`);
    }

    if (!response.ok) {
      // Intentar obtener el cuerpo de la respuesta para más detalles
      let errorBody = '';
      try {
        errorBody = await response.text();
        // eslint-disable-next-line no-console
        console.error('[Empleados] Error al obtener lista:', response.status, response.statusText);
        // eslint-disable-next-line no-console
        console.error('[Empleados] Error body:', errorBody);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Empleados] Error al obtener lista:', response.status, response.statusText);
      }
      throw new Error(`Error al obtener lista de empleados: ${response.status} - ${errorBody || response.statusText}`);
    }

    // Obtener el texto de la respuesta primero para ver qué formato tiene
    const responseText = await response.text();
    // eslint-disable-next-line no-console
    console.log('[Empleados] Respuesta raw (primeros 2000 chars):', responseText.substring(0, 2000));
    
    let data;
    try {
      data = JSON.parse(responseText);
      
      // Si la respuesta es un string JSON dentro de otro JSON, parsear de nuevo
      if (typeof data === 'string') {
        // eslint-disable-next-line no-console
        console.log('[Empleados] Respuesta es un string JSON, parseando de nuevo...');
        data = JSON.parse(data);
      }
    } catch (parseError) {
      // eslint-disable-next-line no-console
      console.error('[Empleados] Error al parsear JSON:', parseError.message);
      // eslint-disable-next-line no-console
      console.error('[Empleados] Respuesta completa:', responseText);
      throw new Error(`Error al parsear respuesta de la API: ${parseError.message}`);
    }
    
    // eslint-disable-next-line no-console
    console.log('[Empleados] Respuesta parseada (tipo):', typeof data);
    // eslint-disable-next-line no-console
    console.log('[Empleados] Respuesta parseada (es array?):', Array.isArray(data));
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta parseada (keys):', Object.keys(data));
    }
    // eslint-disable-next-line no-console
    console.log('[Empleados] Respuesta completa de la API (primeros 2000 chars):', JSON.stringify(data, null, 2).substring(0, 2000));
    
    // Normalizar la respuesta (puede venir como array o como objeto con una propiedad)
    let empleados = [];
    if (Array.isArray(data)) {
      empleados = data;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta es un array directo');
    } else if (data && Array.isArray(data.Table)) {
      // La API devuelve los datos en data.Table
      empleados = data.Table;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta tiene propiedad "Table" con', empleados.length, 'empleados');
    } else if (data && Array.isArray(data.empleados)) {
      empleados = data.empleados;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta tiene propiedad "empleados"');
    } else if (data && Array.isArray(data.data)) {
      empleados = data.data;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta tiene propiedad "data"');
    } else if (data && Array.isArray(data.result)) {
      empleados = data.result;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta tiene propiedad "result"');
    } else if (data && Array.isArray(data.resultado)) {
      empleados = data.resultado;
      // eslint-disable-next-line no-console
      console.log('[Empleados] Respuesta tiene propiedad "resultado"');
    } else if (data && typeof data === 'object') {
      // Si es un objeto, intentar encontrar arrays dentro
      // eslint-disable-next-line no-console
      console.log('[Empleados] Buscando arrays en el objeto...');
      for (const key in data) {
        if (Array.isArray(data[key])) {
          empleados = data[key];
          // eslint-disable-next-line no-console
          console.log('[Empleados] Encontrado array en propiedad:', key, 'con', data[key].length, 'elementos');
          break;
        }
      }
    }
    
    // eslint-disable-next-line no-console
    console.log('[Empleados] Empleados obtenidos:', empleados.length);
    if (empleados.length === 0 && data) {
      // eslint-disable-next-line no-console
      console.warn('[Empleados] ADVERTENCIA: No se encontraron empleados en la respuesta. Estructura completa:', JSON.stringify(data, null, 2));
    }
    
    return empleados;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Empleados] Error al consultar lista:', error.message);
    throw error;
  }
}

/**
 * Busca un empleado por email en la lista
 * @param {string} email - Email del empleado a buscar
 * @returns {Promise<Object|null>} Empleado encontrado o null si no existe/no tiene acceso
 */
export async function findEmpleadoByEmail(email) {
  if (!email) {
    return null;
  }

  const empleadosApiUrl = process.env.EMPLEADOS_API_URL;
  const mockAuth = process.env.MOCK_AUTH === 'true';
  
  // Si estamos en modo MOCK y no hay endpoint configurado, permitir acceso con datos mock
  if (mockAuth && !empleadosApiUrl) {
    // eslint-disable-next-line no-console
    console.log('[Empleados] Modo MOCK: EMPLEADOS_API_URL no configurado, usando datos mock para:', email);
    
    // Normalizar email para extraer username
    const normalizedEmail = String(email).trim().toLowerCase();
    let username = normalizedEmail;
    if (normalizedEmail.includes('@')) {
      username = normalizedEmail.split('@')[0];
    }
    
    // Crear empleado mock con acceso total
    return {
      IdEmpleado: '1401', // IdEmpleado por defecto para desarrollo
      Email: normalizedEmail,
      accesototal: true,
      accesoLimitado: false,
      _mock: true, // Flag para indicar que es mock
    };
  }

  try {
    const empleados = await getEmpleadosList();
    
    // Si la lista está vacía y estamos en modo MOCK, usar datos mock
    if (empleados.length === 0 && mockAuth) {
      // eslint-disable-next-line no-console
      console.log('[Empleados] Lista vacía en modo MOCK, usando datos mock para:', email);
      
      const normalizedEmail = String(email).trim().toLowerCase();
      let username = normalizedEmail;
      if (normalizedEmail.includes('@')) {
        username = normalizedEmail.split('@')[0];
      }
      
      return {
        IdEmpleado: '1401',
        Email: normalizedEmail,
        accesototal: true,
        accesoLimitado: false,
        _mock: true,
      };
    }
    
    // Normalizar email para comparación (lowercase, trim)
    const normalizedEmail = String(email).trim().toLowerCase();
    
    // eslint-disable-next-line no-console
    console.log('[Empleados] Buscando empleado con email:', normalizedEmail);
    // eslint-disable-next-line no-console
    console.log('[Empleados] Total de empleados en la lista:', empleados.length);
    if (empleados.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[Empleados] Primeros 3 empleados (para debug):', empleados.slice(0, 3).map(emp => ({
        IdEmpleado: emp.IDEMPLEADO || emp.IdEmpleado || emp.idEmpleado,
        Email: emp.EMAILPERSONAL || emp.emailPersonal || emp.Email || emp.email,
        accesototal: emp.accesototal || emp.accesoTotal || emp.ACCESOTOTAL,
        accesoLimitado: emp.accesoLimitado || emp.ACCESOLIMITADO || emp.acceso_limitado,
        // Mostrar todos los campos para debugging
        allFields: Object.keys(emp),
      })));
    }
    
    // Buscar empleado por email (case-insensitive)
    // La API puede devolver el email en diferentes campos: Email, email, EMAILPERSONAL, etc.
    const empleado = empleados.find(emp => {
      // Intentar todos los posibles nombres de campo para el email
      const empEmail = String(
        emp.Email || 
        emp.email || 
        emp.EMAILPERSONAL || 
        emp.emailPersonal ||
        emp.EmailPersonal ||
        emp.EMAIL ||
        emp.EMAIL_PERSONAL ||
        emp.email_personal ||
        ''
      ).trim().toLowerCase();
      return empEmail === normalizedEmail;
    });
    
    if (!empleado) {
      // eslint-disable-next-line no-console
      console.log('[Empleados] No se encontró empleado con email:', normalizedEmail);
      if (empleados.length > 0) {
        // eslint-disable-next-line no-console
        console.log('[Empleados] Emails disponibles (primeros 10):', empleados.slice(0, 10).map(emp => 
          emp.EMAILPERSONAL || emp.emailPersonal || emp.Email || emp.email
        ).filter(Boolean));
      }
      return null;
    }
    
    // Normalizar estructura del empleado
    // La API puede devolver los campos en diferentes formatos (mayúsculas, camelCase, etc.)
    const empleadoNormalizado = {
      IdEmpleado: empleado.IDEMPLEADO || empleado.IdEmpleado || empleado.idEmpleado || empleado.Id || empleado.id || empleado.ID,
      Email: empleado.EMAILPERSONAL || empleado.emailPersonal || empleado.EmailPersonal || empleado.Email || empleado.email || empleado.EMAIL || empleado.EMAIL_PERSONAL || empleado.email_personal,
      // Nombre del empleado (puede venir en diferentes campos)
      EMPLEADO: empleado.EMPLEADO || empleado.empleado || empleado.Nombre || empleado.nombre || empleado.NOMBRE || empleado.NombreEmpleado || empleado.nombreEmpleado || empleado.NOMBRE_EMPLEADO || empleado.nombre_empleado,
      // La API usa ACCESOTOTALPORTAL y ACCESOLIMITADOPORTAL (con "PORTAL" al final)
      accesototal: empleado.ACCESOTOTALPORTAL !== undefined ? empleado.ACCESOTOTALPORTAL : (empleado.accesototal || empleado.accesoTotal || empleado.ACCESOTOTAL || empleado.ACCESO_TOTAL || empleado.acceso_total || false),
      accesoLimitado: empleado.ACCESOLIMITADOPORTAL !== undefined ? empleado.ACCESOLIMITADOPORTAL : (empleado.accesoLimitado || empleado.ACCESOLIMITADO || empleado.ACCESO_LIMITADO || empleado.acceso_limitado || false),
      // Mantener datos originales por si acaso
      ...empleado,
    };
    
    // Verificar si tiene algún tipo de acceso
    if (!empleadoNormalizado.accesototal && !empleadoNormalizado.accesoLimitado) {
      // eslint-disable-next-line no-console
      console.log('[Empleados] Empleado encontrado pero sin acceso:', email);
      return null;
    }
    
    // eslint-disable-next-line no-console
    console.log('[Empleados] Empleado encontrado:', {
      IdEmpleado: empleadoNormalizado.IdEmpleado,
      Email: empleadoNormalizado.Email,
      accesototal: empleadoNormalizado.accesototal,
      accesoLimitado: empleadoNormalizado.accesoLimitado,
    });
    
    return empleadoNormalizado;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Empleados] Error al buscar empleado:', error.message);
    
    // Si estamos en modo MOCK y hay error, permitir acceso con datos mock
    if (mockAuth) {
      // eslint-disable-next-line no-console
      console.log('[Empleados] Error en modo MOCK, usando datos mock para:', email);
      
      const normalizedEmail = String(email).trim().toLowerCase();
      return {
        IdEmpleado: '1401',
        Email: normalizedEmail,
        accesototal: true,
        accesoLimitado: false,
        _mock: true,
      };
    }
    
    // Si no es modo MOCK, no permitir acceso
    return null;
  }
}
