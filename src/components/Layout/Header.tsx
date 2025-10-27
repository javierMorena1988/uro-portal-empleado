import React from 'react';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, isSidebarOpen }) => {
  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? (
            <span className="close-icon">✕</span>
          ) : (
            <span className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </span>
          )}
        </button>
        <div className="header-logo">
          <img src="/src/assets/urovesa.png" alt="UROVESA" width="32" height="32" />
        </div>
      </div>
      
      <div className="header-title">
        <h1>Portal Empleado</h1>
      </div>
      
      <div className="header-right">
        <button className="logout-header-btn" aria-label="Cerrar sesión">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
