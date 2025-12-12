import React, { useState, useEffect } from 'react';
import OtpInput from 'react-otp-input';
import { useAuth } from '../../hooks/useAuth';
import { setup2FA, verify2FA, get2FAStatus } from '../../services/auth';
import './Profile.css';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  
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

  // Cargar estado de 2FA al montar el componente
  useEffect(() => {
    load2FAStatus();
  }, [user?.username]);

  const load2FAStatus = async () => {
    if (!user?.username) return;
    
    setTwoFactorLoading(true);
    try {
      const response = await get2FAStatus(user.username);
      if (response.success) {
        setTwoFactorEnabled(response.enabled);
      }
    } catch (error) {
      console.error('Error al cargar estado de 2FA:', error);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    if (!user?.username) return;
    
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    setShow2FASetup(true);
    setVerificationCode('');
    
    try {
      const response = await setup2FA(user.username);
      if (response.success && response.qrCode) {
        setQrCode(response.qrCode);
      } else {
        setTwoFactorError(response.error || 'Error al generar código QR');
        setShow2FASetup(false);
      }
    } catch (error) {
      setTwoFactorError('Error al configurar 2FA');
      setShow2FASetup(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!user?.username || verificationCode.length !== 6) return;
    
    setVerifying(true);
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    
    try {
      const response = await verify2FA(user.username, verificationCode);
      if (response.success) {
        setTwoFactorSuccess('2FA habilitado correctamente');
        setTwoFactorEnabled(true);
        setShow2FASetup(false);
        setQrCode(null);
        setVerificationCode('');
        // Recargar estado después de un momento
        setTimeout(() => {
          load2FAStatus();
        }, 1000);
      } else {
        setTwoFactorError(response.error || 'Código inválido. Por favor, intenta de nuevo.');
        setVerificationCode('');
      }
    } catch (error) {
      setTwoFactorError('Error al verificar código');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel2FASetup = () => {
    setShow2FASetup(false);
    setQrCode(null);
    setVerificationCode('');
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
  };

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

        <div className="profile-section">
          <h3>🔐 Seguridad - Autenticación de Doble Factor (2FA)</h3>
          
          {twoFactorLoading ? (
            <p>Cargando estado de seguridad...</p>
          ) : (
            <>
              <div className="two-factor-status">
                <div className="status-info">
                  <span className="status-label">Estado de 2FA:</span>
                  <span className={`status-badge ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                    {twoFactorEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}
                  </span>
                </div>
                
                {twoFactorEnabled ? (
                  <p className="status-description">
                    Tu cuenta está protegida con autenticación de doble factor. 
                    Se te solicitará un código de 6 dígitos cada vez que inicies sesión.
                  </p>
                ) : (
                  <div className="two-factor-setup">
                    <p className="status-description">
                      La autenticación de doble factor añade una capa adicional de seguridad a tu cuenta. 
                      Se te solicitará un código de 6 dígitos de tu aplicación de autenticación cada vez que inicies sesión.
                    </p>
                    
                    {!show2FASetup ? (
                      <button 
                        className="btn-setup-2fa" 
                        onClick={handleSetup2FA}
                      >
                        🔐 Configurar 2FA
                      </button>
                    ) : (
                      <div className="two-factor-setup-flow">
                        <div className="setup-step">
                          <h4>Paso 1: Escanea el código QR</h4>
                          <p>Usa tu aplicación de autenticación (Google Authenticator, Microsoft Authenticator, etc.) para escanear este código:</p>
                          
                          {qrCode ? (
                            <div className="qr-code-container">
                              <img src={qrCode} alt="QR Code 2FA" className="qr-code-image" />
                            </div>
                          ) : (
                            <p>Cargando código QR...</p>
                          )}
                          
                          <div className="setup-instructions">
                            <p><strong>Instrucciones:</strong></p>
                            <ol>
                              <li>Abre Google Authenticator, Microsoft Authenticator o cualquier app compatible en tu móvil</li>
                              <li>Escanee el código QR que aparece arriba</li>
                              <li>Anota el código de 6 dígitos que aparece en tu app</li>
                              <li>Ingresa el código en el campo de abajo para verificar y habilitar 2FA</li>
                            </ol>
                          </div>
                        </div>
                        
                        <div className="setup-step">
                          <h4>Paso 2: Verifica el código</h4>
                          <p>Ingresa el código de 6 dígitos que aparece en tu aplicación de autenticación:</p>
                          
                          <div className="otp-input-container">
                            <OtpInput
                              value={verificationCode}
                              onChange={setVerificationCode}
                              numInputs={6}
                              renderSeparator={<span>-</span>}
                              renderInput={(props) => <input {...props} />}
                              inputStyle={{
                                width: "3rem",
                                height: "3rem",
                                margin: "0 0.25rem",
                                fontSize: "1.25rem",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                textAlign: "center",
                              }}
                            />
                          </div>
                          
                          <div className="setup-actions">
                            <button 
                              className="btn-verify-2fa"
                              onClick={handleVerify2FA}
                              disabled={verificationCode.length !== 6 || verifying}
                            >
                              {verifying ? 'Verificando...' : 'Verificar y Habilitar 2FA'}
                            </button>
                            <button 
                              className="btn-cancel-2fa"
                              onClick={handleCancel2FASetup}
                              disabled={verifying}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {twoFactorError && (
                <div className="alert alert-error">
                  {twoFactorError}
                </div>
              )}
              
              {twoFactorSuccess && (
                <div className="alert alert-success">
                  {twoFactorSuccess}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
