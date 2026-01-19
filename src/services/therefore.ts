export type ExecuteSingleQueryRequest = Record<string, unknown>;
export type ExecuteSingleQueryResponse = unknown;

export async function executeSingleQuery(payload: ExecuteSingleQueryRequest): Promise<ExecuteSingleQueryResponse> {
  const resp = await fetch('/api/therefore/executeSingleQuery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`ExecuteSingleQuery failed: ${resp.status}`);
  return resp.json();
}

export interface GetDocumentRequest {
  DocNo: number;
  VersionNo?: number;
}

export async function getDocument(docNo: number | string, versionNo?: number): Promise<unknown> {
  const requestBody: GetDocumentRequest = {
    DocNo: typeof docNo === 'string' ? parseInt(docNo, 10) : docNo,
  };
  
  if (versionNo !== undefined) {
    requestBody.VersionNo = versionNo;
  }

  const resp = await fetch('/api/therefore/getDocument', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  if (!resp.ok) throw new Error(`GetDocument failed: ${resp.status}`);
  return resp.json();
}

/**
 * Obtiene el documento como blob para visualizarlo
 * @param docNo - Número de documento
 * @param versionNo - Versión del documento (opcional)
 * @returns Promise con el blob del documento
 */
export async function viewDocument(
  docNo: number | string,
  versionNo?: number
): Promise<Blob> {
  const requestBody: GetDocumentRequest = {
    DocNo: typeof docNo === 'string' ? parseInt(docNo, 10) : docNo,
  };
  
  if (versionNo !== undefined) {
    requestBody.VersionNo = versionNo;
  }

  const resp = await fetch('/api/therefore/downloadDocument', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  if (!resp.ok) {
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await resp.json().catch(() => ({ message: `Error ${resp.status}` }));
      let errorMessage = errorData.error || errorData.message || `ViewDocument failed: ${resp.status}`;
      
      if (errorData.error && errorData.error.includes('Credenciales inválidas')) {
        errorMessage = 'Error de autenticación: Las credenciales de Therefore son incorrectas. Verifica THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env del servidor.';
      } else if (errorData.details && errorData.details.includes('Invalid user name or password')) {
        errorMessage = 'Error de autenticación: Usuario o contraseña de Therefore incorrectos. Verifica las credenciales en el archivo .env del servidor.';
      }
      
      throw new Error(errorMessage);
    } else {
      const errorText = await resp.text().catch(() => `Error ${resp.status}`);
      throw new Error(`ViewDocument failed: ${errorText}`);
    }
  }

  // Obtener el blob del archivo
  return await resp.blob();
}

/**
 * Descarga el archivo de un documento desde Therefore
 * @param docNo - Número de documento
 * @param versionNo - Versión del documento (opcional)
 * @param filename - Nombre del archivo para la descarga (opcional)
 * @returns Promise que se resuelve cuando la descarga se completa
 */
export async function downloadDocument(
  docNo: number | string, 
  versionNo?: number, 
  filename?: string
): Promise<void> {
  const requestBody: GetDocumentRequest = {
    DocNo: typeof docNo === 'string' ? parseInt(docNo, 10) : docNo,
  };
  
  if (versionNo !== undefined) {
    requestBody.VersionNo = versionNo;
  }

  const resp = await fetch('/api/therefore/downloadDocument', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  if (!resp.ok) {
    // Verificar si la respuesta es JSON (error) o un archivo
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await resp.json().catch(() => ({ message: `Error ${resp.status}` }));
      
      // Mensajes de error más amigables
      let errorMessage = errorData.error || errorData.message || `DownloadDocument failed: ${resp.status}`;
      
      if (errorData.error && errorData.error.includes('Credenciales inválidas')) {
        errorMessage = 'Error de autenticación: Las credenciales de Therefore son incorrectas. Verifica THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env del servidor.';
      } else if (errorData.details && errorData.details.includes('Invalid user name or password')) {
        errorMessage = 'Error de autenticación: Usuario o contraseña de Therefore incorrectos. Verifica las credenciales en el archivo .env del servidor.';
      }
      
      throw new Error(errorMessage);
    } else {
      // Si no es JSON, intentar leer el error como texto
      const errorText = await resp.text().catch(() => `Error ${resp.status}`);
      throw new Error(`DownloadDocument failed: ${errorText}`);
    }
  }

  // Verificar que la respuesta sea realmente un archivo
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    // Si la respuesta es JSON aunque el status sea 200, puede ser un error
    const data = await resp.json().catch(() => null);
    if (data && (data.error || data.message)) {
      throw new Error(data.error || data.message || 'Error al descargar el documento');
    }
  }

  // Obtener el blob del archivo
  const blob = await resp.blob();
  
  // Obtener el nombre del archivo desde el header o usar el proporcionado
  const contentDisposition = resp.headers.get('content-disposition') || '';
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const downloadFilename = filename || 
    (filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : `document_${docNo}.pdf`);
  
  // Crear un enlace temporal para descargar el archivo
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export type CreateDocumentRequest = Record<string, unknown>;
export type CreateDocumentResponse = unknown;

export async function createDocument(payload: CreateDocumentRequest): Promise<CreateDocumentResponse> {
  const resp = await fetch('/api/therefore/createDocument', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`CreateDocument failed: ${resp.status}`);
  return resp.json();
}

/**
 * Función de prueba para verificar que Therefore funciona correctamente
 * @param docNo - Número de documento a consultar (opcional, por defecto 1)
 * @returns Datos del documento o error si falla
 */
export async function testTherefore(docNo: number | string = 1): Promise<{ success: boolean; data?: unknown; error?: string; details?: string }> {
  try {
    console.log('🧪 Probando conexión con Therefore...');
    console.log(`📄 Consultando documento: ${docNo}`);
    
    const requestBody: GetDocumentRequest = {
      DocNo: typeof docNo === 'string' ? parseInt(docNo, 10) : docNo,
    };
    
    const resp = await fetch('/api/therefore/getDocument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ message: `Error ${resp.status}` }));
      const errorMessage = errorData.error || errorData.message || `Error ${resp.status}`;
      const errorDetails = errorData.details || errorData.error;
      
      console.error('❌ Error al probar Therefore:', errorMessage);
      if (errorDetails) {
        console.error('📋 Detalles:', errorDetails);
      }
      
      return {
        success: false,
        error: errorMessage,
        details: errorDetails,
      };
    }
    
    const data = await resp.json();
    
    console.log('✅ Therefore funciona correctamente!');
    console.log('📦 Datos recibidos:', data);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error al probar Therefore:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}



