import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useBlockBrowserBack } from '../../hooks';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  useBlockBrowserBack();

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="layout">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={handleSidebarClose}
        activeView={activeView}
        onViewChange={onViewChange}
      />
      
      <div className="main-content">
        <Header
          onMenuToggle={handleMenuToggle}
          isSidebarOpen={isSidebarOpen}
          activeView={activeView}
          onViewChange={onViewChange}
        />
        
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
