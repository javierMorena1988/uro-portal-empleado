import React from "react";
import { useAuth } from "../../hooks";
import "./Dashboard.css";

interface DashboardProps {
  onViewChange: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { user } = useAuth();
  
  // Obtener el nombre del empleado del campo EMPLEADO
  const empleadoNombre: string = (() => {
    const emp = user?.empleado;
    if (!emp) return user?.name || 'Usuario';
    
    // Verificar si es un string directamente
    if (typeof emp === 'string') return emp;
    
    // Buscar en las propiedades del objeto empleado
    const nombre = (emp as Record<string, unknown>)?.EMPLEADO || 
                   (emp as Record<string, unknown>)?.empleado || 
                   (emp as Record<string, unknown>)?.nombreEmpleado || 
                   (emp as Record<string, unknown>)?.NombreEmpleado;
    
    // Asegurar que sea string
    if (typeof nombre === 'string') return nombre;
    if (typeof nombre === 'number') return String(nombre);
    
    return user?.name || 'Usuario';
  })();
  
  // Obtener fecha actual formateada
  const getCurrentDate = () => {
    const today = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dayName = days[today.getDay()];
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    return `Hoy es ${dayName}, ${day} de ${month} de ${year}`;
  };
  const handlePayrollClick = (payroll: { id: string; month: string; date: string }) => {
    // En el futuro, aquí navegarás a la nómina específica
    console.log('Navegando a nómina:', payroll);
    // Por ahora, navega a la sección de nóminas
    onViewChange('payroll');
  };

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
      title: "Documentación Laboral",
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
    // Documentos privados oculto temporalmente
    // {
    //   id: "private-docs",
    //   title: "Documentos privados",
    //   description: "Contratos, certificados y documentación personal",
    //   icon: (
    //     <svg
    //       width="28"
    //       height="28"
    //       viewBox="0 0 24 24"
    //       fill="none"
    //       stroke="currentColor"
    //       strokeWidth="2"
    //     >
    //       <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    //       <circle cx="12" cy="16" r="1" />
    //       <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    //     </svg>
    //   ),
    // },
  ];

  // Nóminas - por ahora vacío, se cargarán desde la API cuando esté disponible
  const latestPayrolls: Array<{ id: string; month: string; date: string }> = [];

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
            <h1>Bienvenido, {empleadoNombre}</h1>
            <p>{getCurrentDate()}</p>
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
        {/* Personal Data Section - Oculto temporalmente */}
        {/* <div className="personal-data-section">
          <div className="personal-data-card">
            <h2>Mis datos</h2>
            {personalData.map((data, index) => (
              <div key={index} className="data-row">
                <span className="data-label">{data.label}</span>
                <span className="data-value">{data.value}</span>
              </div>
            ))}
          </div>
        </div> */}

        {/* Latest Payrolls Section */}
        <div className="payrolls-section">
          <div className="payrolls-card">
            <h2>Últimas nóminas</h2>
            {latestPayrolls.length > 0 ? (
              <>
                {latestPayrolls.map((payroll, index) => (
                  <button 
                    key={index} 
                    className="payroll-row payroll-button"
                    onClick={() => handlePayrollClick(payroll)}
                  >
                    <div className="payroll-info">
                      <h4 className="payroll-month">{payroll.month}</h4>
                      <p className="payroll-date">{payroll.date}</p>
                    </div>
                  </button>
                ))}
                <div className="payroll-footer">
                  <button 
                    className="view-all-link"
                    onClick={() => onViewChange('payroll')}
                  >
                    Ver todas las nóminas
                  </button>
                </div>
              </>
            ) : (
              <div className="payroll-empty">
                <p>No hay nóminas disponibles</p>
              </div>
            )}
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
