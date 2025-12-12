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

export async function getDocument(docNo: number | string): Promise<unknown> {
  const resp = await fetch(`/api/therefore/getDocument?docNo=${encodeURIComponent(String(docNo))}`);
  if (!resp.ok) throw new Error(`GetDocument failed: ${resp.status}`);
  return resp.json();
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
    
    const resp = await fetch(`/api/therefore/getDocument?docNo=${encodeURIComponent(String(docNo))}`);
    
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



