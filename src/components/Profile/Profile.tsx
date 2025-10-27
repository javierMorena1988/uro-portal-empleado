import React, { useState } from 'react';
import './Profile.css';

const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: 'Javier Morena',
    email: 'javier.morena@urovesa.com',
    phone: '+34 123 456 789',
    position: 'Desarrollador Frontend',
    department: 'Tecnología',
    hireDate: '2023-01-15',
    employeeId: 'EMP-001',
    address: 'Calle Principal 123, Madrid',
    emergencyContact: 'María Morena - +34 987 654 321',
  });

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // Aquí se haría la llamada a la API para guardar los datos
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Aquí se restaurarían los datos originales
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            <span className="avatar-text">JM</span>
          </div>
          <button className="change-photo-btn">📷 Cambiar foto</button>
        </div>
        
        <div className="profile-info">
          <h2>{profileData.name}</h2>
          <p className="profile-position">{profileData.position}</p>
          <p className="profile-department">{profileData.department}</p>
        </div>
        
        <div className="profile-actions">
          <button 
            className={`action-btn ${isEditing ? 'cancel-btn' : 'edit-btn'}`}
            onClick={isEditing ? handleCancel : () => setIsEditing(true)}
          >
            {isEditing ? '✕ Cancelar' : '✏️ Editar'}
          </button>
          {isEditing && (
            <button className="action-btn save-btn" onClick={handleSave}>
              💾 Guardar
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>Información Personal</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Nombre completo</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              ) : (
                <span>{profileData.name}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Email</label>
              {isEditing ? (
                <input 
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              ) : (
                <span>{profileData.email}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Teléfono</label>
              {isEditing ? (
                <input 
                  type="tel" 
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              ) : (
                <span>{profileData.phone}</span>
              )}
            </div>
            
            <div className="info-item">
              <label>Dirección</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              ) : (
                <span>{profileData.address}</span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Información Laboral</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Puesto</label>
              <span>{profileData.position}</span>
            </div>
            
            <div className="info-item">
              <label>Departamento</label>
              <span>{profileData.department}</span>
            </div>
            
            <div className="info-item">
              <label>ID de empleado</label>
              <span>{profileData.employeeId}</span>
            </div>
            
            <div className="info-item">
              <label>Fecha de contratación</label>
              <span>{new Date(profileData.hireDate).toLocaleDateString('es-ES')}</span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Contacto de Emergencia</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Contacto</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={profileData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                />
              ) : (
                <span>{profileData.emergencyContact}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
