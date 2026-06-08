import React, { useState } from 'react';
import OtpInput from 'react-otp-input';
import { setup2FA, verify2FA } from '../../services/auth';
import { useBlockBrowserBack } from '../../hooks';
import { OTP_INPUT_STYLE, renderNumericOtpInput, sanitizeOtpValue } from './otpInputConfig';
import './LoginForm.css';

interface Setup2FAProps {
  username: string;
  password: string;
  allowCancel?: boolean;
  onSetupComplete: (verifiedCode: string) => void;
  onCancel: () => void;
}

const Setup2FA: React.FC<Setup2FAProps> = ({
  username,
  password,
  allowCancel = true,
  onSetupComplete,
  onCancel,
}) => {
  useBlockBrowserBack();
  const [step, setStep] = useState<'credentials' | 'qr' | 'verify'>('credentials');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isMobile = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent || '';
    return window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod/i.test(userAgent);
  }, []);

  const applySetupResponse = (response: {
    qrCode?: string | null;
    secret?: string | null;
    otpauth_url?: string | null;
    resumed?: boolean;
  }) => {
    setQrCode(response.qrCode || null);
    setSecret(response.secret || null);
    setOtpauthUrl(response.otpauth_url || null);
    setStep('qr');
  };

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await setup2FA(username, password);
      if (response.success && (response.qrCode || response.otpauth_url || response.secret)) {
        applySetupResponse(response);
      } else {
        setError(response.error || 'Error al configurar autenticación de doble factor');
      }
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    setCopied(false);

    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      const tempInput = document.createElement('input');
      tempInput.value = secret;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setCopied(true);
    }
  };

  const handleOpenAuthenticator = () => {
    if (!otpauthUrl) return;
    window.location.href = otpauthUrl;
  };

  const handleOtpChange = (value: string) => {
    setVerificationCode(sanitizeOtpValue(value));
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
        onSetupComplete(verificationCode);
      } else {
        setError(response.error || 'Código inválido. Por favor, intenta de nuevo.');
        setVerificationCode('');
      }
    } catch {
      setError('Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'credentials') {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Configurar autenticación de doble factor</h2>
          <p className="setup-description">
            Para acceder a la aplicación, debes configurar la autenticación de doble factor (2FA).
            Este paso es obligatorio y no se puede omitir.
          </p>

          {error && <div className="form-error-message">{error}</div>}

          <div className="setup-info">
            <p><strong>Correo:</strong> {username}</p>
            <p>Las credenciales ya han sido validadas. Pulsa el botón para continuar con la configuración.</p>
          </div>

          <div className="setup-actions">
            <button
              type="button"
              onClick={handleStartSetup}
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Preparando configuración...' : 'Comenzar configuración'}
            </button>
            {allowCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="cancel-button"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'qr') {
    return (
      <div className="login-container">
        <div className="login-box setup-box">
          <h2>{isMobile ? 'Configura 2FA en tu móvil' : 'Escanea el código QR'}</h2>

          {isMobile ? (
            <>
              <p className="setup-description">
                Sigue estos pasos para añadir tu cuenta a Google Authenticator u otra app compatible.
              </p>

              {otpauthUrl && (
                <button
                  type="button"
                  onClick={handleOpenAuthenticator}
                  className="login-button authenticator-link"
                >
                  Abrir Google Authenticator
                </button>
              )}

              {secret && (
                <div className="setup-instructions-box">
                  <h3>¿No se abre la app? Usa la clave manual</h3>
                  <p className="manual-secret">{secret}</p>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="cancel-button copy-secret-button"
                  >
                    {copied ? 'Clave copiada al portapapeles' : 'Copiar clave al portapapeles'}
                  </button>
                  <ol className="setup-help-steps">
                    <li>Pulsa <strong>Copiar clave al portapapeles</strong> (arriba).</li>
                    <li>Abre <strong>Google Authenticator</strong> (o Microsoft Authenticator).</li>
                    <li>Pulsa el <strong>+</strong> y elige <strong>Introducir clave de configuración</strong>.</li>
                    <li>Pega la clave copiada y confirma el nombre de la cuenta.</li>
                    <li>Vuelve aquí, pulsa <strong>Continuar</strong> e introduce el código de 6 dígitos.</li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('verify')}
                className="login-button"
              >
                Continuar
              </button>
            </>
          ) : qrCode ? (
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
                  <li>Haz clic en &quot;Continuar&quot; e ingresa el código para verificar</li>
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
        <h2>Verifica el código</h2>
        <p>Introduce solo números: el código de 6 dígitos que aparece en tu app de autenticación.</p>

        <div className="otp-input-container">
          <OtpInput
            value={verificationCode}
            onChange={handleOtpChange}
            numInputs={6}
            renderSeparator={<span>-</span>}
            renderInput={renderNumericOtpInput}
            inputStyle={OTP_INPUT_STYLE}
            shouldAutoFocus
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
            {loading ? 'Verificando...' : 'Verificar y habilitar 2FA'}
          </button>
          <button
            type="button"
            onClick={() => setStep('qr')}
            disabled={loading}
            className="cancel-button"
          >
            Volver al paso anterior
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup2FA;
