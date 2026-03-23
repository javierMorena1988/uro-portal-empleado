import React, { useState } from 'react';
import { downloadDocument, viewDocument } from '../../services/therefore';
import './Payroll.css';

interface PayrollItem {
  id: string;
  month: string;
  year: number;
  date: string;
  docNo?: number; // DocNo del documento en Therefore
}

const Payroll: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>('');

  // Datos de nóminas (vacío hasta que tengamos el endpoint)
  const payrollData: PayrollItem[] = [];

  const handleView = async (payroll: PayrollItem) => {
    if (!payroll.docNo) {
      setViewError('No se encontró el número de documento para esta nómina');
      setTimeout(() => setViewError(null), 5000);
      return;
    }

    setViewing(payroll.id);
    setViewError(null);

    try {
      // Obtener el documento como blob
      const blob = await viewDocument(payroll.docNo);
      
      // Crear una URL del blob y mostrarlo en el modal
      const url = window.URL.createObjectURL(blob);
      setDocumentUrl(url);
      setDocumentTitle(`Nómina ${payroll.month} ${payroll.year}`);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Error al visualizar la nómina';
      
      // Mensajes de error más amigables
      if (errorMessage.includes('THEREFORE_BASE_URL')) {
        errorMessage = 'Error de configuración: THEREFORE_BASE_URL no está configurado. Por favor, configura las variables de Therefore en el archivo .env del servidor.';
      } else if (errorMessage.includes('Credenciales')) {
        errorMessage = 'Error de configuración: Las credenciales de Therefore no están configuradas. Por favor, configura THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env del servidor.';
      }
      
      setViewError(errorMessage);
      console.error('Error al visualizar nómina:', error);
      setTimeout(() => setViewError(null), 8000);
    } finally {
      setViewing(null);
    }
  };

  const handleCloseModal = () => {
    if (documentUrl) {
      window.URL.revokeObjectURL(documentUrl);
      setDocumentUrl(null);
      setDocumentTitle('');
    }
  };

  const handleDownload = async (payroll: PayrollItem) => {
    if (!payroll.docNo) {
      setDownloadError('No se encontró el número de documento para esta nómina');
      setTimeout(() => setDownloadError(null), 5000);
      return;
    }

    setDownloading(payroll.id);
    setDownloadError(null);

    try {
      const filename = `Nomina_${payroll.month}_${payroll.year}.pdf`;
      await downloadDocument(payroll.docNo, undefined, filename);
      // La descarga se maneja automáticamente en downloadDocument
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Error al descargar la nómina';
      
      // Mensajes de error más amigables
      if (errorMessage.includes('THEREFORE_BASE_URL')) {
        errorMessage = 'Error de configuración: THEREFORE_BASE_URL no está configurado. Por favor, configura las variables de Therefore en el archivo .env del servidor.';
      } else if (errorMessage.includes('Credenciales')) {
        errorMessage = 'Error de configuración: Las credenciales de Therefore no están configuradas. Por favor, configura THEREFORE_USERNAME y THEREFORE_PASSWORD en el archivo .env del servidor.';
      }
      
      setDownloadError(errorMessage);
      console.error('Error al descargar nómina:', error);
      setTimeout(() => setDownloadError(null), 8000);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="payroll-container">
      <div className="payroll-header">
        <div className="payroll-header-content">
          <div>
            <h1 className="payroll-title">Nóminas</h1>
            <p className="payroll-subtitle">Consulta y descarga tus nóminas</p>
          </div>
        </div>
      </div>

      <div className="payroll-content">
        {(downloadError || viewError) && (
          <div className="payroll-error-message" style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #fcc'
          }}>
            ⚠️ {downloadError || viewError}
          </div>
        )}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="payroll-section-title" style={{ margin: 0 }}>Historial de nóminas</h2>
        </div>
        
        {payrollData.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ margin: '0 auto 1rem', opacity: 0.5 }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>
              No hay nóminas disponibles
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', opacity: 0.7 }}>
              Las nóminas aparecerán aquí una vez que se configure el endpoint
            </p>
          </div>
        ) : (
          <div className="payroll-list">
            {payrollData.map((payroll) => (
            <div key={payroll.id} className="payroll-item">
              <div className="payroll-item-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              
              <div className="payroll-item-content">
                <h3 className="payroll-item-title">
                  Nómina {payroll.month} {payroll.year}
                </h3>
                <p className="payroll-item-date">
                  Fecha: {payroll.date}
                </p>
                
                <div className="payroll-item-actions">
                  <button 
                    className="payroll-action-btn payroll-view-btn"
                    onClick={() => handleView(payroll)}
                    disabled={viewing === payroll.id || !payroll.docNo}
                  >
                    {viewing === payroll.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinning">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Ver
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="payroll-action-btn payroll-download-btn"
                    onClick={() => handleDownload(payroll)}
                    disabled={downloading === payroll.id || !payroll.docNo}
                  >
                    {downloading === payroll.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinning">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Descargando...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Descargar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Modal para visualizar documento */}
      {documentUrl && (
        <div className="payroll-modal-overlay" onClick={handleCloseModal}>
          <div className="payroll-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="payroll-modal-header">
              <h3 className="payroll-modal-title">{documentTitle}</h3>
              <button 
                className="payroll-modal-close"
                onClick={handleCloseModal}
                aria-label="Cerrar"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="payroll-modal-body">
              <iframe 
                src={documentUrl} 
                className="payroll-modal-iframe"
                title={documentTitle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
