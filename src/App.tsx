import React, { useState } from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import Documents from './components/Documents/Documents';
import './App.css';

type ActiveView = 'dashboard' | 'payroll' | 'public-docs' | 'private-docs';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'payroll':
        return <div className="coming-soon">💰 Nóminas - Próximamente</div>;
      case 'public-docs':
        return <div className="coming-soon">📁 Documentos públicos - Próximamente</div>;
      case 'private-docs':
        return <div className="coming-soon">🔒 Documentos privados - Próximamente</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Layout>
  );
}

export default App;
