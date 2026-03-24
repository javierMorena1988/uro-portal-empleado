import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { getPayrollDocuments, getPublicDocuments } from '../../services/therefore';
import './Sidebar.css';
import urovesaLogo from '../../assets/urovesa.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeView, onViewChange }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [payrollCount, setPayrollCount] = useState<number | null>(null);
  // Solo mostrar administración para javier.morena@inforges.es
  const userEmail = user?.email || user?.empleado?.Email || '';
  const isAdmin = userEmail.toLowerCase() === 'javier.morena@inforges.es';

  // Leer contadores desde localStorage y escuchar actualizaciones
  useEffect(() => {
    const updateCounts = () => {
      const publicCount = localStorage.getItem('publicDocumentsCount');
      const payrollStoredCount = localStorage.getItem('payrollDocumentsCount');

      setDocumentCount(publicCount ? parseInt(publicCount, 10) : null);
      setPayrollCount(payrollStoredCount ? parseInt(payrollStoredCount, 10) : null);
    };

    // Leer al montar
    updateCounts();

    // Escuchar cambios en localStorage (para otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'publicDocumentsCount' || e.key === 'payrollDocumentsCount') {
        updateCounts();
      }
    };

    // Escuchar eventos personalizados (misma pestaña)
    const handlePublicDocsCountChange = (e: CustomEvent<number>) => {
      setDocumentCount(e.detail);
    };

    const handlePayrollCountChange = (e: CustomEvent<number>) => {
      setPayrollCount(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('publicDocumentsCountChanged', handlePublicDocsCountChange as EventListener);
    window.addEventListener('payrollDocumentsCountChanged', handlePayrollCountChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('publicDocumentsCountChanged', handlePublicDocsCountChange as EventListener);
      window.removeEventListener('payrollDocumentsCountChanged', handlePayrollCountChange as EventListener);
    };
  }, []);

  // Precargar contadores al iniciar sesión (sin esperar a abrir ninguna pestaña)
  useEffect(() => {
    const preloadCounts = async () => {
      if (!user?.idEmpleado) {
        setDocumentCount(null);
        setPayrollCount(null);
        return;
      }

      try {
        const [publicResponse, payrollResponse] = await Promise.all([
          getPublicDocuments(user.idEmpleado),
          getPayrollDocuments(user.idEmpleado),
        ]);

        const publicTotal = publicResponse.success ? (publicResponse.documents?.length ?? 0) : 0;
        const payrollTotal = payrollResponse.success ? (payrollResponse.documents?.length ?? 0) : 0;

        setDocumentCount(publicTotal);
        setPayrollCount(payrollTotal);
        localStorage.setItem('publicDocumentsCount', String(publicTotal));
        localStorage.setItem('payrollDocumentsCount', String(payrollTotal));
        window.dispatchEvent(new CustomEvent('publicDocumentsCountChanged', { detail: publicTotal }));
        window.dispatchEvent(new CustomEvent('payrollDocumentsCountChanged', { detail: payrollTotal }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Sidebar] Error al precargar contadores:', error);
      }
    };

    preloadCounts();
  }, [user?.idEmpleado]);

  const menuItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    count?: number | null;
  }> = [
    { 
      id: 'dashboard', 
      label: 'Inicio', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      )
    },
    { 
      id: 'payroll', 
      label: 'Nóminas', 
      count: payrollCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      )
    },
    { 
      id: 'public-docs', 
      label: 'Documentación Laboral', 
      count: documentCount,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      )
    },
    // Documentos privados oculto temporalmente
    // { 
    //   id: 'private-docs', 
    //   label: 'Documentos privados', 
    //   icon: (
    //     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    //       <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    //       <circle cx="12" cy="16" r="1"/>
    //       <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    //     </svg>
    //   )
    // },
  ];

  const handleItemClick = (itemId: string) => {
    onViewChange(itemId);
    onClose(); // Cerrar sidebar en mobile después de seleccionar
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <img src={urovesaLogo} alt="UROVESA" width="200" height="200" />
            </div>
          </div>
        </div>
        
        <div className="sidebar-header-mobile">
          <div className="user-icon-mobile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="user-name-mobile">
            {(() => {
              const emp = user?.empleado;
              if (!emp) return user?.name || 'Usuario';
              if (typeof emp === 'string') return emp;
              const nombre = (emp as Record<string, unknown>)?.EMPLEADO || 
                           (emp as Record<string, unknown>)?.empleado || 
                           (emp as Record<string, unknown>)?.nombreEmpleado || 
                           (emp as Record<string, unknown>)?.NombreEmpleado;
              if (typeof nombre === 'string') return nombre;
              if (typeof nombre === 'number') return String(nombre);
              return user?.name || 'Usuario';
            })()}
          </div>
        </div>
        
        <div className="user-info">
          <div className="user-name">
            {(() => {
              const emp = user?.empleado;
              if (!emp) return user?.name || 'Usuario';
              if (typeof emp === 'string') return emp;
              const nombre = (emp as Record<string, unknown>)?.EMPLEADO || 
                           (emp as Record<string, unknown>)?.empleado || 
                           (emp as Record<string, unknown>)?.nombreEmpleado || 
                           (emp as Record<string, unknown>)?.NombreEmpleado;
              if (typeof nombre === 'string') return nombre;
              if (typeof nombre === 'number') return String(nombre);
              return user?.name || 'Usuario';
            })()}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.id} className="nav-item">
                <button 
                  className={`nav-link ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">
                    {item.label}
                    {item.count !== null && item.count !== undefined && (
                      <span className="nav-count"> ({item.count})</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {isAdmin && (
              <li key="admin" className="nav-item">
                <Link 
                  to="/admin/users"
                  className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </span>
                  <span className="nav-label">Administración</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <span className="logout-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="logout-text">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
