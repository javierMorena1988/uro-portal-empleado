import React from "react";
import "./Dashboard.css";

interface DashboardProps {
  onViewChange: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const quickAccessItems = [
    {
      id: "payroll",
      title: "Nóminas",
      description: "Consulta y descarga tus nóminas mensuales",
      icon: (
        <svg
          width="28"
          height="28"
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
      ),
    },
    {
      id: "public-docs",
      title: "Documentos públicos",
      description: "Políticas, calendarios y recursos de la empresa",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "private-docs",
      title: "Documentos privados",
      description: "Contratos, certificados y documentación personal",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <circle cx="12" cy="16" r="1" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ];

  const personalData = [
    { label: "Nombre completo", value: "Beatriz Rodríguez Donsión" },
    { label: "Departamento", value: "Tecnología" },
    { label: "Fecha de inicio", value: "15/03/2022" },
    { label: "Tipo de contrato", value: "Indefinido" },
  ];

  const latestPayrolls = [
    { month: "Septiembre 2025", date: "30/09/2025" },
    { month: "Agosto 2025", date: "31/08/2025" },
    { month: "Julio 2025", date: "31/07/2025" },
  ];

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="user-avatar">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="welcome-text">
            <h1>Bienvenida, Beatriz Rodríguez Donsión</h1>
            <p>Hoy es viernes, 24 de octubre de 2025</p>
          </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="quick-access-section">
        <h2>Acceso rápido</h2>
        <div className="quick-access-grid">
          {quickAccessItems.map((item, index) => (
            <div 
              key={index} 
              className="quick-access-card"
              onClick={() => onViewChange(item.id)}
            >
              <div className="card-icon">{item.icon}</div>
              <h3 className="card-title">{item.title}</h3>
              <p className="card-description">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Data and Payrolls Container */}
      <div className="data-payrolls-container">
        {/* Personal Data Section */}
        <div className="personal-data-section">
          <div className="personal-data-card">
            <h2>Mis datos</h2>
            {personalData.map((data, index) => (
              <div key={index} className="data-row">
                <span className="data-label">{data.label}</span>
                <span className="data-value">{data.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Payrolls Section */}
        <div className="payrolls-section">
          <div className="payrolls-card">
            <h2>Últimas nóminas</h2>
            {latestPayrolls.map((payroll, index) => (
              <div key={index} className="payroll-row">
                <div className="payroll-info">
                  <h4 className="payroll-month">{payroll.month}</h4>
                  <p className="payroll-date">{payroll.date}</p>
                </div>
              </div>
            ))}
            <div className="payroll-footer">
              <button 
                className="view-all-link"
                onClick={() => onViewChange('payroll')}
              >
                Ver todas las nóminas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <div className="help-content">
            <div className="help-text">
              <h3>¿Necesitas ayuda?</h3>
              <p>
                Contacta con el departamento de Recursos Humanos
                para cualquier consulta o solicitud.
              </p>
            </div>
            <button className="contact-btn">Contactar RRHH</button>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
