import React, { useState } from 'react';
import OtpInput from 'react-otp-input';
import { setup2FA, verify2FA } from '../../services/auth';
import './LoginForm.css';

interface Setup2FAProps {
  username: string;
  password: string;
  onSetupComplete: (verifiedCode: string) => void;
  onCancel: () => void;
}

const Setup2FA: React.FC<Setup2FAProps> = ({ username, password, onSetupComplete, onCancel }) => {
  const [step, setStep] = useState<'credentials' | 'qr' | 'verify'>('credentials');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await setup2FA(username, password);
      if (response.success && response.qrCode) {
        setQrCode(response.qrCode);
        setStep('qr');
      } else {
        setError(response.error || 'Error al generar código QR');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Por favor, ingresa un código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await verify2FA(username, verificationCode);
      if (response.success) {
        // 2FA configurado exitosamente, pasar el código verificado para hacer login automático
        onSetupComplete(verificationCode);
      } else {
        setError(response.error || 'Código inválido. Por favor, intenta de nuevo.');
        setVerificationCode('');
      }
    } catch (error) {
      setError('Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'credentials') {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>🔐 Configurar Autenticación de Doble Factor</h2>
          <p className="setup-description">
            Para acceder a la aplicación, debes configurar la autenticación de doble factor (2FA).
            Esto añade una capa adicional de seguridad a tu cuenta.
          </p>
          
          {error && <div className="form-error-message">{error}</div>}
          
          <div className="setup-info">
            <p><strong>Usuario:</strong> {username}</p>
            <p>Las credenciales ya han sido validadas. Haz clic en el botón para comenzar la configuración.</p>
          </div>

          <div className="setup-actions">
            <button
              type="button"
              onClick={handleStartSetup}
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Generando código QR...' : 'Comenzar Configuración'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="cancel-button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'qr') {
    return (
      <div className="login-container">
        <div className="login-box setup-box">
          <h2>📱 Escanea el Código QR</h2>
          
          {qrCode ? (
            <>
              <div className="qr-code-container-setup">
                <img src={qrCode} alt="QR Code 2FA" className="qr-code-image-setup" />
              </div>
              
              <div className="setup-instructions-box">
                <h3>Instrucciones:</h3>
                <ol>
                  <li>Abre Google Authenticator, Microsoft Authenticator o cualquier app compatible en tu móvil</li>
                  <li>Escanea el código QR que aparece arriba</li>
                  <li>Anota el código de 6 dígitos que aparece en tu app</li>
                  <li>Haz clic en "Continuar" e ingresa el código para verificar</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setStep('verify')}
                className="login-button"
              >
                Continuar
              </button>
            </>
          ) : (
            <p>Cargando código QR...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box setup-box">
        <h2>✅ Verifica el Código</h2>
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

        {error && <div className="form-error-message">{error}</div>}

        <div className="setup-actions">
          <button
            type="button"
            onClick={handleVerify}
            disabled={verificationCode.length !== 6 || loading}
            className="login-button"
          >
            {loading ? 'Verificando...' : 'Verificar y Habilitar 2FA'}
          </button>
          <button
            type="button"
            onClick={() => setStep('qr')}
            disabled={loading}
            className="cancel-button"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup2FA;

