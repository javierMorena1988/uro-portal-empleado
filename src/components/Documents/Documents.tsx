import React, { useState } from 'react';
import './Documents.css';

const Documents: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');

  const pendingDocuments = [
    {
      id: 1,
      title: 'Contrato de trabajo actualizado',
      type: 'Contrato',
      date: '2024-01-15',
      status: 'pending',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Política de confidencialidad',
      type: 'Política',
      date: '2024-01-10',
      status: 'pending',
      priority: 'medium'
    }
  ];

  const signedDocuments = [
    {
      id: 3,
      title: 'Contrato inicial',
      type: 'Contrato',
      date: '2023-01-15',
      status: 'signed',
      priority: 'high'
    },
    {
      id: 4,
      title: 'Política de seguridad',
      type: 'Política',
      date: '2023-06-20',
      status: 'signed',
      priority: 'medium'
    },
    {
      id: 5,
      title: 'Manual de empleado',
      type: 'Manual',
      date: '2023-03-10',
      status: 'signed',
      priority: 'low'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Normal';
    }
  };

  const handleSignDocument = (documentId: number) => {
    // Aquí se implementaría la lógica para firmar el documento
    console.log(`Firmando documento ${documentId}`);
  };

  const handleDownloadDocument = (documentId: number) => {
    // Aquí se implementaría la lógica para descargar el documento
    console.log(`Descargando documento ${documentId}`);
  };

  const renderDocumentCard = (doc: any) => (
    <div key={doc.id} className="document-card">
      <div className="document-header">
        <div className="document-info">
          <h4 className="document-title">{doc.title}</h4>
          <div className="document-meta">
            <span className="document-type">{doc.type}</span>
            <span className="document-date">{new Date(doc.date).toLocaleDateString('es-ES')}</span>
          </div>
        </div>
        <div className="document-priority">
          <span 
            className="priority-badge"
            style={{ backgroundColor: getPriorityColor(doc.priority) }}
          >
            {getPriorityText(doc.priority)}
          </span>
        </div>
      </div>
      
      <div className="document-actions">
        <button 
          className="action-btn download-btn"
          onClick={() => handleDownloadDocument(doc.id)}
        >
          📥 Descargar
        </button>
        {doc.status === 'pending' && (
          <button 
            className="action-btn sign-btn"
            onClick={() => handleSignDocument(doc.id)}
          >
            ✍️ Firmar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="documents">
      <div className="documents-header">
        <h2>Documentos</h2>
        <p>Gestiona tus documentos laborales</p>
      </div>

      <div className="documents-tabs">
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📋 Pendientes ({pendingDocuments.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'signed' ? 'active' : ''}`}
          onClick={() => setActiveTab('signed')}
        >
          ✅ Firmados ({signedDocuments.length})
        </button>
      </div>

      <div className="documents-content">
        {activeTab === 'pending' && (
          <div className="documents-section">
            <h3>Documentos Pendientes de Firma</h3>
            {pendingDocuments.length > 0 ? (
              <div className="documents-grid">
                {pendingDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h4>No hay documentos pendientes</h4>
                <p>Todos tus documentos están al día</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'signed' && (
          <div className="documents-section">
            <h3>Documentos Firmados</h3>
            {signedDocuments.length > 0 ? (
              <div className="documents-grid">
                {signedDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h4>No hay documentos firmados</h4>
                <p>Los documentos que firmes aparecerán aquí</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
