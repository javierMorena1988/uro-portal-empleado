import React, { useState, useEffect } from "react";
import { MESSAGES, DOCUMENT_CATEGORIES, DOCUMENT_ACTIONS } from "../../constants";
import { getPublicDocuments, getDictionaryInfo } from "../../services/therefore";
import { useAuth } from "../../hooks/useAuth";
import "./PublicDocuments.css";

interface Document {
  id: string;
  title: string;
  category: typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES] | string;
  date: string;
  size: string;
  DocNo?: number;
  tipoDocumento?: string | null;
  tipoDocumentoId?: number | null;
}

const PublicDocuments: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<
    "Todos" | typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES] | string
  >("Todos");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [rawDocuments, setRawDocuments] = useState<any[]>([]); // Guardar documentos sin transformar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<Record<number, string>>({});
  const [dictionaryId, setDictionaryId] = useState<number | null>(null);
  const { user } = useAuth();

  // Cargar tipos de documento desde Therefore cuando tengamos el dictionaryId
  useEffect(() => {
    const loadDocumentTypes = async () => {
      if (!dictionaryId) {
        // eslint-disable-next-line no-console
        console.log('[PublicDocuments] ⏳ Esperando dictionaryId... (actual:', dictionaryId, ')');
        return; // Esperar a tener el dictionaryId
      }

      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] 🚀 INICIANDO carga de diccionario con ID:', dictionaryId);

      try {
        const dictResponse = await getDictionaryInfo(dictionaryId);
        // eslint-disable-next-line no-console
        console.log('[PublicDocuments] ✅ Respuesta de getDictionaryInfo:', JSON.stringify(dictResponse, null, 2));

        if (dictResponse.success && dictResponse.data) {
          const types: Record<number, string> = {};

          // La estructura es: data.Dictionary.Items[]
          // Cada item tiene: { ID: number, Name: string, ... }
          if (dictResponse.data && typeof dictResponse.data === 'object') {
            const dictionary = (dictResponse.data as any).Dictionary;

            if (dictionary && dictionary.Items && Array.isArray(dictionary.Items)) {
              // eslint-disable-next-line no-console
              console.log('[PublicDocuments] Procesando Items del diccionario:', dictionary.Items.length);

              dictionary.Items.forEach((item: any) => {
                if (item.ID !== undefined && item.Name) {
                  types[item.ID] = item.Name;
                  // eslint-disable-next-line no-console
                  console.log(`[PublicDocuments] Tipo ${item.ID} -> "${item.Name}"`);
                }
              });
            } else {
              // eslint-disable-next-line no-console
              console.error('[PublicDocuments] No se encontró Dictionary.Items en la respuesta');
              // eslint-disable-next-line no-console
              console.log('[PublicDocuments] Estructura de data:', Object.keys(dictResponse.data || {}));
            }
          }

          // eslint-disable-next-line no-console
          console.log('[PublicDocuments] ✅ Tipos de documento cargados:', types);
          setDocumentTypes(types);
        } else {
          // eslint-disable-next-line no-console
          console.error('[PublicDocuments] ❌ getDictionaryInfo no devolvió success o data. Response:', dictResponse);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[PublicDocuments] ❌ Error al cargar tipos de documento:', err);
        // No es crítico, continuar sin los tipos
      }
    };

    loadDocumentTypes();
  }, [dictionaryId]);

  // Transformar documentos cuando tengamos los documentos (no esperar a tipos si ya hay documentos)
  useEffect(() => {
    if (rawDocuments.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[PublicDocuments] Esperando documentos...');
      return; // Esperar a tener documentos
    }

    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] ✅ Transformando documentos. Tipos cargados:', Object.keys(documentTypes).length > 0 ? 'Sí' : 'No (usando fallback)');

    // Transformar los documentos de Therefore al formato esperado
    // La estructura es: { DocNo, IndexValues: [nombreDocumento, tipoDocumentoId], Size, VersionNo }
    // tipoDocumentoId es un número que debemos usar para obtener la descripción del diccionario
    const transformedDocs: Document[] = rawDocuments.map((doc: any, index: number) => {
      // eslint-disable-next-line no-console
      console.log(`[PublicDocuments] Procesando documento ${index}:`, doc);

      // El nombre del documento está en IndexValues[0]
      const nombreDocumento = doc.IndexValues && doc.IndexValues.length > 0
        ? doc.IndexValues[0]
        : `Documento ${index + 1}`;

      // El tipo de documento está en IndexValues[1] (ID numérico)
      const tipoDocumentoId = doc.IndexValues && doc.IndexValues.length > 1
        ? Number(doc.IndexValues[1])
        : null;

      // La fecha del documento está en IndexValues[2]
      const fechaArchivoDocumento = doc.IndexValues && doc.IndexValues.length > 2
        ? doc.IndexValues[2]
        : null;

      // Formatear la fecha
      const formatDate = (fecha: any): string => {
        if (!fecha) return new Date().toLocaleDateString('es-ES');
        
        // Si es un string con formato de fecha, intentar parsearlo
        if (typeof fecha === 'string') {
          try {
            const date = new Date(fecha);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('es-ES');
            }
            // Si el string ya está en formato legible, devolverlo tal cual
            return fecha;
          } catch {
            return fecha;
          }
        }
        
        // Si es un número (timestamp), convertirlo
        if (typeof fecha === 'number') {
          try {
            const date = new Date(fecha);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('es-ES');
            }
          } catch {
            // Ignorar error
          }
        }
        
        return new Date().toLocaleDateString('es-ES');
      };

      // Obtener la descripción del tipo desde el diccionario usando el ID
      const tipoDocumentoDesc = tipoDocumentoId && documentTypes[tipoDocumentoId]
        ? documentTypes[tipoDocumentoId]
        : null;

      // eslint-disable-next-line no-console
      console.log(`[PublicDocuments] Tipo ID ${tipoDocumentoId} -> Descripción: ${tipoDocumentoDesc}`);
      // eslint-disable-next-line no-console
      console.log(`[PublicDocuments] Fecha del documento: ${fechaArchivoDocumento}`);

      // Usar la descripción del tipo como categoría (no hardcoded)
      // Si no hay descripción, usar un fallback temporal
      const category = tipoDocumentoDesc || `Tipo ${tipoDocumentoId || 'Desconocido'}`;

      // Formatear el tamaño (Size está en bytes)
      const sizeInBytes = doc.Size || 0;
      const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
      };

      return {
        id: String(doc.DocNo || index + 1),
        title: nombreDocumento,
        category: category, // Usar descripción real del diccionario (no hardcoded)
        date: formatDate(fechaArchivoDocumento), // Usar la fecha del servicio
        size: formatSize(sizeInBytes),
        DocNo: doc.DocNo,
        VersionNo: doc.VersionNo,
        tipoDocumento: tipoDocumentoDesc, // Guardar la descripción del tipo
        tipoDocumentoId: tipoDocumentoId, // Guardar también el ID
      };
    });

    // eslint-disable-next-line no-console
    console.log('[PublicDocuments] Documentos transformados:', transformedDocs);
    setDocuments(transformedDocs);
  }, [rawDocuments, documentTypes]);

  // Cargar documentos públicos desde Therefore
  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      try {
        // Obtener idEmpleado del usuario autenticado
        if (!user || !user.idEmpleado) {
          setError('No se pudo obtener el ID del empleado. Por favor, inicia sesión nuevamente.');
          setLoading(false);
          return;
        }

        const idEmpleado = user.idEmpleado;

        const response = await getPublicDocuments(idEmpleado);

        // eslint-disable-next-line no-console
        console.log('[PublicDocuments] Respuesta completa del backend:', JSON.stringify(response, null, 2));

        if (response.success) {
          // Si hay información de debug, mostrarla
          if ((response as any).debug) {
            // eslint-disable-next-line no-console
            console.log('[PublicDocuments] Debug info:', (response as any).debug);
          }

          // Extraer el ID del diccionario de la respuesta
          // Buscar en Columns el campo tipoDocumento y extraer el número del TypeTableName
          if ((response as any).debug && (response as any).debug.rawResponse) {
            const rawResponse = (response as any).debug.rawResponse;
            // eslint-disable-next-line no-console
            console.log('[PublicDocuments] 🔍 Buscando dictionaryId en rawResponse...');

            if (rawResponse.QueryResult && rawResponse.QueryResult.Columns) {
              // eslint-disable-next-line no-console
              console.log('[PublicDocuments] ✅ Columns encontradas:', rawResponse.QueryResult.Columns.length);

              const tipoDocumentoColumn = rawResponse.QueryResult.Columns.find(
                (col: any) => col.ColName === 'tipoDocumento' || col.FieldID === 'tipoDocumento'
              );

              // eslint-disable-next-line no-console
              console.log('[PublicDocuments] Columna tipoDocumento:', tipoDocumentoColumn ? '✅ encontrada' : '❌ no encontrada');

              if (tipoDocumentoColumn) {
                // eslint-disable-next-line no-console
                console.log('[PublicDocuments] TypeTableName:', tipoDocumentoColumn.TypeTableName);

                if (tipoDocumentoColumn.TypeTableName) {
                  // Extraer el número de "TheKeywords19" -> 19
                  const match = tipoDocumentoColumn.TypeTableName.match(/TheKeywords(\d+)/);

                  if (match && match[1]) {
                    const extractedId = Number(match[1]);
                    // eslint-disable-next-line no-console
                    console.log('[PublicDocuments] ✅ ID del diccionario extraído:', extractedId, 'de TypeTableName:', tipoDocumentoColumn.TypeTableName);
                    setDictionaryId(extractedId);
                  } else {
                    // eslint-disable-next-line no-console
                    console.error('[PublicDocuments] ❌ No se pudo extraer el ID del diccionario de:', tipoDocumentoColumn.TypeTableName);
                  }
                } else {
                  // eslint-disable-next-line no-console
                  console.error('[PublicDocuments] ❌ TypeTableName está vacío o no existe');
                }
              } else {
                // eslint-disable-next-line no-console
                console.error('[PublicDocuments] ❌ No se encontró la columna tipoDocumento en Columns');
                // eslint-disable-next-line no-console
                console.log('[PublicDocuments] Columnas disponibles:', rawResponse.QueryResult.Columns.map((c: any) => c.ColName || c.FieldID));
              }
            } else {
              // eslint-disable-next-line no-console
              console.error('[PublicDocuments] ❌ No se encontró QueryResult.Columns en rawResponse');
              // eslint-disable-next-line no-console
              console.log('[PublicDocuments] Estructura de rawResponse:', Object.keys(rawResponse || {}));
            }
          } else {
            // eslint-disable-next-line no-console
            console.error('[PublicDocuments] ❌ No se encontró debug.rawResponse en la respuesta');
          }

          if (response.documents && response.documents.length > 0) {
            // eslint-disable-next-line no-console
            console.log('[PublicDocuments] Documentos recibidos:', response.documents);

            // Guardar los documentos sin transformar (esperaremos a que se carguen los tipos)
            setRawDocuments(response.documents);
          } else {
            // No hay documentos pero la respuesta fue exitosa
            // eslint-disable-next-line no-console
            console.log('[PublicDocuments] No se encontraron documentos');
            setDocuments([]);
          }
        } else {
          const errorMsg = response.error || 'Error al cargar documentos';
          // eslint-disable-next-line no-console
          console.error('[PublicDocuments] Error:', errorMsg);
          setError(errorMsg);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [user, documentTypes]);

  // Datos mock de documentos públicos (fallback si hay error)
  const mockDocuments: Document[] = [
    {
      id: "1",
      title: "Manual del empleado 2025",
      category: DOCUMENT_CATEGORIES.POLITICAS,
      date: "15/01/2025",
      size: "2.4 MB",
    },
    {
      id: "2",
      title: "Calendario laboral 2025",
      category: DOCUMENT_CATEGORIES.RECURSOS,
      date: "10/01/2025",
      size: "856 KB",
    },
    {
      id: "3",
      title: "Política de teletrabajo",
      category: DOCUMENT_CATEGORIES.POLITICAS,
      date: "05/01/2025",
      size: "1.2 MB",
    },
    {
      id: "4",
      title: "Guía de beneficios sociales",
      category: DOCUMENT_CATEGORIES.RECURSOS,
      date: "20/12/2024",
      size: "3.1 MB",
    },
    {
      id: "5",
      title: "Protocolo de seguridad y salud",
      category: DOCUMENT_CATEGORIES.POLITICAS,
      date: "15/12/2024",
      size: "1.8 MB",
    },
    {
      id: "6",
      title: "Plan de formación anual",
      category: DOCUMENT_CATEGORIES.RECURSOS,
      date: "01/12/2024",
      size: "2.0 MB",
    },
  ];

  // Usar documentos reales o mock si hay error
  const displayDocuments = error && documents.length === 0 ? mockDocuments : documents;

  const filteredDocuments =
    activeFilter === "Todos"
      ? displayDocuments
      : displayDocuments.filter((doc) => doc.category === activeFilter);

  // Guardar el contador de documentos en localStorage y disparar evento para que el Sidebar lo pueda leer
  useEffect(() => {
    const count = displayDocuments.length;
    localStorage.setItem('publicDocumentsCount', String(count));
    // Disparar evento personalizado para actualizar el Sidebar en la misma pestaña
    window.dispatchEvent(new CustomEvent('publicDocumentsCountChanged', { detail: count }));
  }, [displayDocuments.length]);

  // Iconos aleatorios para documentos
  const documentIcons = [
    // Icono de documento
    <svg key="doc1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>,
    // Icono de carpeta
    <svg key="folder" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>,
    // Icono de archivo PDF
    <svg key="pdf" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>,
    // Icono de documento con texto
    <svg key="doc2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>,
    // Icono de archivo con clip
    <svg key="clip" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>,
  ];

  const getDocumentIcon = (documentId: string) => {
    // Usar el ID del documento para seleccionar un icono de forma consistente
    const iconIndex = parseInt(documentId) % documentIcons.length;
    return documentIcons[iconIndex] || documentIcons[0];
  };

  const handleView = async (document: Document) => {
    if (document.DocNo) {
      try {
        const { viewDocument } = await import("../../services/therefore");
        const blob = await viewDocument(document.DocNo);
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Limpiar el URL después de un tiempo
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } catch (err) {
        console.error("Error al visualizar documento:", err);
        alert("Error al visualizar el documento");
      }
    } else {
    console.log("Ver documento:", document);
    }
  };

  const handleDownload = async (document: Document) => {
    if (document.DocNo) {
      try {
        const { downloadDocument } = await import("../../services/therefore");
        await downloadDocument(document.DocNo);
      } catch (err) {
        console.error("Error al descargar documento:", err);
        alert("Error al descargar el documento");
      }
    } else {
    console.log("Descargar documento:", document);
    }
  };

  return (
    <div className="public-documents-container">
      <div className="public-documents-header">
        <h1 className="public-documents-title">{MESSAGES.DOCUMENTS.PUBLIC.TITLE}</h1>
        <p className="public-documents-subtitle">
          {MESSAGES.DOCUMENTS.PUBLIC.SUBTITLE}
        </p>
      </div>
      {/* Filtros */}
      <div className="public-document-filters">
        <button
          className={`filter-btn ${activeFilter === "Todos" ? "active" : ""}`}
          onClick={() => setActiveFilter("Todos")}
        >
          {MESSAGES.DOCUMENTS.PUBLIC.FILTER_ALL}
        </button>
        {/* Generar filtros dinámicamente basados en los tipos de documento únicos */}
        {Array.from(new Set(documents.map(doc => doc.tipoDocumento || doc.category).filter(Boolean))).map((category) => (
          <button
            key={category}
            className={`filter-btn ${activeFilter === category ? "active" : ""}`}
            onClick={() => setActiveFilter(category)}
          >
            {category}
          </button>
        ))}
        {/* Mantener filtros hardcoded como fallback si no hay tipos dinámicos */}
        {documents.length === 0 && (
          <>
        <button
              className={`filter-btn ${activeFilter === DOCUMENT_CATEGORIES.POLITICAS ? "active" : ""
          }`}
          onClick={() => setActiveFilter(DOCUMENT_CATEGORIES.POLITICAS)}
        >
          {DOCUMENT_CATEGORIES.POLITICAS}
        </button>
        <button
              className={`filter-btn ${activeFilter === DOCUMENT_CATEGORIES.RECURSOS ? "active" : ""
          }`}
          onClick={() => setActiveFilter(DOCUMENT_CATEGORIES.RECURSOS)}
        >
          {DOCUMENT_CATEGORIES.RECURSOS}
        </button>
          </>
        )}
      </div>

      <div className="public-documents-content">
        {/* Mensaje de error */}
        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
            Error: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            Cargando documentos...
          </div>
        )}

        {/* Lista de documentos */}
        {!loading && (
        <div className="public-documents-list">
            {filteredDocuments.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                No se encontraron documentos
              </div>
            ) : (
              filteredDocuments.map((document) => (
            <div key={document.id} className="public-document-item">
              <div className="public-document-item-header">
                <div className="public-document-item-icon">
                      {getDocumentIcon(document.id)}
                </div>

                <div className="public-document-item-content">
                  <h3 className="public-document-item-title">
                    {document.title}
                  </h3>

                  <span className="public-document-category">
                    {document.category}
                  </span>
                </div>
              </div>

              <div className="public-document-item-meta">
                <span className="public-document-date">{document.date}</span>
                <span className="public-document-size">{document.size}</span>
              </div>

              <div className="public-document-item-actions">
                <button
                  className="public-document-action-btn public-document-view-btn"
                  onClick={() => handleView(document)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {DOCUMENT_ACTIONS.VIEW}
                </button>

                <button
                  className="public-document-action-btn public-document-download-btn"
                  onClick={() => handleDownload(document)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {DOCUMENT_ACTIONS.DOWNLOAD}
                </button>
              </div>
            </div>
              ))
            )}
        </div>
        )}

        {/* Sección de ayuda */}
        <div className="help-section">
          <div className="help-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <div className="help-content">
            <h3 className="help-title">{MESSAGES.DOCUMENTS.PUBLIC.HELP_TITLE}</h3>
            <p className="help-text">
              {MESSAGES.DOCUMENTS.PRIVATE.REQUEST_TEXT}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDocuments;
