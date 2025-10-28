import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import Documents from './components/Documents/Documents';
import Payroll from './components/Payroll/Payroll';
import PublicDocuments from './components/PublicDocuments/PublicDocuments';
import PrivateDocuments from './components/PrivateDocuments/PrivateDocuments';
import LoginForm from './components/Login/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

type ActiveView = 'dashboard' | 'payroll' | 'public-docs' | 'private-docs';

function AppContent() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onViewChange={setActiveView} />;
      case 'payroll':
        return <Payroll />;
      case 'public-docs':
        return <PublicDocuments />;
      case 'private-docs':
        return <PrivateDocuments />;
      default:
        return <Dashboard onViewChange={setActiveView} />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
