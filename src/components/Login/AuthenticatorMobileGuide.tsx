import React from 'react';
import {
  detectMobilePlatform,
  openMicrosoftAuthenticator,
} from './authenticatorMobile';

interface AuthenticatorMobileGuideProps {
  otpauthUrl: string | null;
  secret: string | null;
  copied: boolean;
  onCopySecret: () => void;
  onContinue: () => void;
}

const AuthenticatorMobileGuide: React.FC<AuthenticatorMobileGuideProps> = ({
  otpauthUrl,
  secret,
  copied,
  onCopySecret,
  onContinue,
}) => {
  const platform = React.useMemo(() => detectMobilePlatform(), []);

  const handleOpenApp = () => {
    if (!otpauthUrl) return;
    openMicrosoftAuthenticator(otpauthUrl, platform);
  };

  return (
    <div className="auth-mobile-guide">
      <p className="setup-description">
        Configura el doble factor con <strong>Microsoft Authenticator</strong>.
      </p>

      {otpauthUrl && (
        <section className="auth-mobile-section">
          <h3 className="auth-mobile-step">Paso 1 · Añadir tu cuenta</h3>
          <p className="auth-mobile-hint">
            {platform === 'ios'
              ? 'Pulsa el botón para añadir tu cuenta. Si iOS te pide elegir app, selecciona Microsoft Authenticator.'
              : 'Pulsa el botón para añadir tu cuenta en Microsoft Authenticator.'}
          </p>
          <button
            type="button"
            className="login-button auth-open-app-btn"
            onClick={handleOpenApp}
          >
            Abrir Microsoft Authenticator
          </button>
        </section>
      )}

      {secret && (
        <section className="auth-mobile-section setup-instructions-box">
          <h3 className="auth-mobile-step">Paso 2 · Si no se abre la app (clave manual)</h3>
          <p className="auth-mobile-hint">
            Copia esta clave y pégala en Microsoft Authenticator: menú <strong>+</strong> →{' '}
            <strong>Otra cuenta (Google, Facebook, etc.)</strong> → <strong>Introducir clave de configuración</strong>.
          </p>
          <p className="manual-secret">{secret}</p>
          <button
            type="button"
            onClick={onCopySecret}
            className="cancel-button copy-secret-button"
          >
            {copied ? 'Clave copiada al portapapeles' : 'Copiar clave al portapapeles'}
          </button>
        </section>
      )}

      <section className="auth-mobile-section">
        <h3 className="auth-mobile-step">Paso 3 · Verificar</h3>
        <p className="auth-mobile-hint">
          Cuando veas el código de 6 dígitos en Microsoft Authenticator, vuelve aquí y pulsa continuar.
        </p>
        <button type="button" onClick={onContinue} className="login-button">
          Continuar e introducir código
        </button>
      </section>
    </div>
  );
};

export default AuthenticatorMobileGuide;
