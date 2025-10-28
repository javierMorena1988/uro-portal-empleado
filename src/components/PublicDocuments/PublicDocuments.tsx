import React, { useState } from 'react';
import './PublicDocuments.css';

interface Document {
  id: string;
  title: string;
  category: 'Políticas' | 'Recursos';
  date: string;
  size: string;
}

const PublicDocuments: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Políticas' | 'Recursos'>('Todos');

  // Datos mock de documentos públicos
  const documents: Document[] = [
    { 
      id: '1', 
      title: 'Manual del empleado 2025', 
      category: 'Políticas', 
      date: '15/01/2025', 
      size: '2.4 MB'
    },
    { 
      id: '2', 
      title: 'Calendario laboral 2025', 
      category: 'Recursos', 
      date: '10/01/2025', 
      size: '856 KB'
    },
    { 
      id: '3', 
      title: 'Política de teletrabajo', 
      category: 'Políticas', 
      date: '05/01/2025', 
      size: '1.2 MB'
    },
    { 
      id: '4', 
      title: 'Guía de beneficios sociales', 
      category: 'Recursos', 
      date: '20/12/2024', 
      size: '3.1 MB'
    },
    { 
      id: '5', 
      title: 'Protocolo de seguridad y salud', 
      category: 'Políticas', 
      date: '15/12/2024', 
      size: '1.8 MB'
    },
    { 
      id: '6', 
      title: 'Plan de formación anual', 
      category: 'Recursos', 
      date: '01/12/2024', 
      size: '2.0 MB'
    },
  ];

  const filteredDocuments = activeFilter === 'Todos' 
    ? documents 
    : documents.filter(doc => doc.category === activeFilter);

  const getDocumentIcon = (category: string) => {
    switch (category) {
      case 'Políticas':
        return (
          <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.66659 13.3334C1.44557 13.3334 1.23361 13.2456 1.07733 13.0893C0.921049 12.933 0.833252 12.7211 0.833252 12.5V1.66671C0.833252 1.44569 0.921049 1.23373 1.07733 1.07745C1.23361 0.921171 1.44557 0.833374 1.66659 0.833374H5.83325C6.71731 0.833374 7.56515 1.18456 8.19027 1.80968C8.8154 2.43481 9.16659 3.28265 9.16659 4.16671C9.16659 3.28265 9.51777 2.43481 10.1429 1.80968C10.768 1.18456 11.6159 0.833374 12.4999 0.833374H16.6666C16.8876 0.833374 17.0996 0.921171 17.2558 1.07745C17.4121 1.23373 17.4999 1.44569 17.4999 1.66671V12.5C17.4999 12.7211 17.4121 12.933 17.2558 13.0893C17.0996 13.2456 16.8876 13.3334 16.6666 13.3334H11.6666C11.0035 13.3334 10.3677 13.5968 9.89882 14.0656C9.42998 14.5344 9.16659 15.1703 9.16659 15.8334C9.16659 15.1703 8.90319 14.5344 8.43435 14.0656C7.96551 13.5968 7.32963 13.3334 6.66659 13.3334H1.66659Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'Recursos':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.66675 1.66675V5.00008" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.3333 1.66675V5.00008" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.8333 3.33325H4.16667C3.24619 3.33325 2.5 4.07944 2.5 4.99992V16.6666C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6666V4.99992C2.5 4.07944 16.7538 3.33325 15.8333 3.33325Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 8.33325H17.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const handleView = (document: Document) => {
    console.log('Ver documento:', document);
    // Aquí implementarías la lógica para ver el documento
  };

  const handleDownload = (document: Document) => {
    console.log('Descargar documento:', document);
    // Aquí implementarías la lógica para descargar el documento
  };

  return (
    <div className="public-documents-container">
      <div className="public-documents-header">
        <h1 className="public-documents-title">Documentos públicos</h1>
        <p className="public-documents-subtitle">Documentación y recursos de la empresa</p>
      </div>

      <div className="public-documents-content">
        {/* Filtros */}
        <div className="public-document-filters">
          <button 
            className={`filter-btn ${activeFilter === 'Todos' ? 'active' : ''}`}
            onClick={() => setActiveFilter('Todos')}
          >
            Todos
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'Políticas' ? 'active' : ''}`}
            onClick={() => setActiveFilter('Políticas')}
          >
            Políticas
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'Recursos' ? 'active' : ''}`}
            onClick={() => setActiveFilter('Recursos')}
          >
            Recursos
          </button>
        </div>

        {/* Lista de documentos */}
        <div className="documents-list">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="public-document-item">
              <div className="public-document-item-header">
                <div className="public-document-item-icon">
                  {getDocumentIcon(document.category)}
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
                <span className="public-document-date">
                  {document.date}
                </span>
                <span className="public-document-size">
                  {document.size}
                </span>
              </div>
              
              <div className="public-document-item-actions">
                <button 
                  className="public-document-action-btn document-view-btn"
                  onClick={() => handleView(document)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Ver
                </button>
                
                <button 
                  className="public-document-action-btn document-download-btn"
                  onClick={() => handleDownload(document)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sección de ayuda */}
        <div className="help-section">
          <div className="help-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div className="help-content">
            <h3 className="help-title">¿No encuentras lo que buscas?</h3>
            <p className="help-text">
              Contacta con el departamento de Recursos Humanos para solicitar acceso a otros documentos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDocuments;
