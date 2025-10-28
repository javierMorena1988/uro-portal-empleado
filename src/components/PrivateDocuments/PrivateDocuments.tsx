import React from "react";
import "./PrivateDocuments.css";

interface PrivateDocument {
  id: string;
  title: string;
  description: string;
  date: string;
  size: string;
  status: "Firmado" | "Disponible";
  type:
    | "contract"
    | "certificate"
    | "work-history"
    | "nda"
    | "evaluation"
    | "company-cert";
}

const PrivateDocuments: React.FC = () => {
  // Datos mock de documentos privados
  const documents: PrivateDocument[] = [
    {
      id: "1",
      title: "Contrato de trabajo",
      description: "Contrato indefinido - Actualización 2024",
      date: "15/03/2024",
      size: "1.2 MB",
      status: "Firmado",
      type: "contract",
    },
    {
      id: "2",
      title: "Certificado de retenciones 2024",
      description: "Modelo 145 - Año fiscal 2024",
      date: "10/01/2025",
      size: "456 KB",
      status: "Disponible",
      type: "certificate",
    },
    {
      id: "3",
      title: "Vida laboral",
      description: "Informe actualizado",
      date: "01/10/2025",
      size: "234 KB",
      status: "Disponible",
      type: "work-history",
    },
    {
      id: "4",
      title: "Acuerdo de confidencialidad",
      description: "NDA - Firmado al inicio",
      date: "15/03/2022",
      size: "890 KB",
      status: "Firmado",
      type: "nda",
    },
    {
      id: "5",
      title: "Evaluación de desempeño 2024",
      description: "Revisión anual",
      date: "20/12/2024",
      size: "2.1 MB",
      status: "Disponible",
      type: "evaluation",
    },
    {
      id: "6",
      title: "Certificado de empresa",
      description: "Para trámites administrativos",
      date: "15/09/2025",
      size: "345 KB",
      status: "Disponible",
      type: "company-cert",
    },
  ];

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "contract":
        return (
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
        );
      case "certificate":
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 3h12l4 6-10 13L2 9l4-6z" />
            <path d="M11 3L8 9l4 13 4-13-3-6" />
            <path d="M2 9h20" />
          </svg>
        );
      case "work-history":
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m0-7V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        );
      case "nda":
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <circle cx="12" cy="16" r="1" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case "evaluation":
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m0-7V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        );
      case "company-cert":
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 3h12l4 6-10 13L2 9l4-6z" />
            <path d="M11 3L8 9l4 13 4-13-3-6" />
            <path d="M2 9h20" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleView = (document: PrivateDocument) => {
    console.log("Ver documento:", document);
    // Aquí implementarías la lógica para ver el documento
  };

  const handleDownload = (document: PrivateDocument) => {
    console.log("Descargar documento:", document);
    // Aquí implementarías la lógica para descargar el documento
  };

  const handleRequestDocument = () => {
    console.log("Solicitar documento adicional");
    // Aquí implementarías la lógica para solicitar documentos
  };

  return (
    <div className="private-documents-container">
      <div className="private-documents-header">
        <h1 className="private-documents-title">Documentos privados</h1>
        <p className="private-documents-subtitle">
          Tu documentación personal y confidencial
        </p>
      </div>

      <div className="private-documents-content">
        {/* Sección de documentos protegidos */}
        <div className="protected-section">
          <div className="protected-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <circle cx="12" cy="16" r="1" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="protected-content">
            <h3 className="protected-title">Documentos protegidos</h3>
            <p className="protected-text">
              Estos documentos son privados y solo tú puedes acceder a ellos. Se
              almacenan de forma segura.
            </p>
          </div>
        </div>

        {/* Lista de documentos */}
        <div className="private-documents-list">
          {documents.map((document) => (
            <div key={document.id} className="private-document-item">
              <div className="private-document-item-main">
                <div className="private-document-item-icon">
                  {getDocumentIcon(document.type)}
                </div>

                <div className="private-document-item-content">
                  <h3 className="private-document-item-title">
                    {document.title}
                  </h3>

                  <p className="private-document-item-description">
                    {document.description}
                  </p>

                  <div className="private-document-item-meta">
                    <span className="private-document-date">
                      {document.date}
                    </span>
                    <span className="private-document-size">
                      {document.size}
                    </span>
                    <span
                      className={`private-document-status ${document.status.toLowerCase()}`}
                    >
                      {document.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="private-document-item-footer">
                <div className="private-document-item-actions">
                  <button
                    className="private-document-action-btn private-document-view-btn"
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
                    <span className="private-document-action-btn-names">
                      Ver
                    </span>
                  </button>

                  <button
                    className="private-document-action-btn document-download-btn"
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
                    <span className="private-document-action-btn-names">
                      Descargar
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sección de solicitud de documentos */}
        <div className="request-section">
          <div className="request-icon">
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
          <div className="request-content">
            <h3 className="request-title">
              ¿Necesitas un documento adicional?
            </h3>
            <p className="request-text">
              Solicita certificados o documentos adicionales a Recursos Humanos
            </p>
            <button className="request-btn" onClick={handleRequestDocument}>
              Solicitar documento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateDocuments;
