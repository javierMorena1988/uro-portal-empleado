import React from 'react';
import './Payroll.css';

interface PayrollItem {
  id: string;
  month: string;
  year: number;
  date: string;
}

const Payroll: React.FC = () => {
  // Datos mock de nóminas
  const payrollData: PayrollItem[] = [
    { id: '1', month: 'Septiembre', year: 2025, date: '30/09/2025' },
    { id: '2', month: 'Agosto', year: 2025, date: '31/08/2025' },
    { id: '3', month: 'Julio', year: 2025, date: '31/07/2025' },
    { id: '4', month: 'Junio', year: 2025, date: '30/06/2025' },
    { id: '5', month: 'Mayo', year: 2025, date: '31/05/2025' },
    { id: '6', month: 'Abril', year: 2025, date: '30/04/2025' },
    { id: '7', month: 'Marzo', year: 2025, date: '31/03/2025' },
    { id: '8', month: 'Febrero', year: 2025, date: '28/02/2025' },
    { id: '9', month: 'Enero', year: 2025, date: '31/01/2025' },
  ];

  const handleView = (payroll: PayrollItem) => {
    console.log('Ver nómina:', payroll);
    // Aquí implementarías la lógica para ver la nómina
  };

  const handleDownload = (payroll: PayrollItem) => {
    console.log('Descargar nómina:', payroll);
    // Aquí implementarías la lógica para descargar la nómina
  };

  return (
    <div className="payroll-container">
      <div className="payroll-header">
        <h1 className="payroll-title">Nóminas</h1>
        <p className="payroll-subtitle">Consulta y descarga tus nóminas</p>
      </div>

      <div className="payroll-content">
        <h2 className="payroll-section-title">Historial de nóminas</h2>
        
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
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Ver
                  </button>
                  
                  <button 
                    className="payroll-action-btn payroll-download-btn"
                    onClick={() => handleDownload(payroll)}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Payroll;
