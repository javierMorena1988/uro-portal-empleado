import React from 'react';
import Modal from '../common/Modal';
import {
  MICROSOFT_AUTHENTICATOR,
  detectMobilePlatform,
  isMobileDevice,
} from './authenticatorMobile';
import './AuthenticatorModals.css';

interface AuthenticatorSetupModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthenticatorSetupModal: React.FC<AuthenticatorSetupModalProps> = ({
  open,
  onClose,
}) => {
  const platform = React.useMemo(() => detectMobilePlatform(), []);
  const isMobile = React.useMemo(() => isMobileDevice(), []);

  const footer = (
    <button type="button" className="auth-modal-footer-btn" onClick={onClose}>
      Entendido
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración de Microsoft Authenticator"
      footer={footer}
    >
      <section className="auth-modal-section">
        <h3>1. Instala Microsoft Authenticator</h3>
        <p>
          Descarga <strong>{MICROSOFT_AUTHENTICATOR.name}</strong> desde la tienda de aplicaciones
          de tu móvil.
        </p>
        <div className="auth-modal-store-links">
          <a
            href={MICROSOFT_AUTHENTICATOR.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-modal-store-link"
          >
            Google Play
          </a>
          <a
            href={MICROSOFT_AUTHENTICATOR.appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-modal-store-link"
          >
            App Store
          </a>
        </div>
      </section>

      <section className="auth-modal-section">
        <h3>2. Inicia el alta en el portal</h3>
        <p>
          Tras validar tu correo y contraseña, pulsa <strong>Comenzar configuración</strong>.
          El sistema preparará tu cuenta para vincularla con Microsoft Authenticator.
        </p>
      </section>

      <section className="auth-modal-section">
        <h3>3. Añade tu cuenta</h3>
        {isMobile ? (
          <>
            <p>
              Pulsa <strong>Abrir Microsoft Authenticator</strong> en el portal.
              {platform === 'android'
                ? ' Si no tienes la app instalada, se abrirá la Play Store automáticamente.'
                : ' Si iOS te pide elegir app, selecciona Microsoft Authenticator.'}
            </p>
            <p>
              Si no se abre la app, copia la clave manual y en la app ve a{' '}
              <strong>+</strong> → <strong>Otra cuenta</strong> →{' '}
              <strong>Introducir clave de configuración</strong>.
            </p>
          </>
        ) : (
          <>
            <p>Se mostrará un código QR asociado a tu cuenta.</p>
            <p>En Microsoft Authenticator, pulsa:</p>
            <ul>
              <li><strong>+</strong> (añadir cuenta)</li>
              <li><strong>Otra cuenta (Google, Facebook, etc.)</strong></li>
              <li><strong>Escanear código QR</strong></li>
            </ul>
          </>
        )}
      </section>

      <section className="auth-modal-section">
        <h3>4. Confirma la configuración</h3>
        <p>
          Introduce en el portal el código de <strong>6 dígitos</strong> que aparece en
          Microsoft Authenticator para verificar que el dispositivo quedó vinculado correctamente.
        </p>
      </section>

      <p className="auth-modal-note">
        Una vez finalizado el proceso podrás iniciar sesión utilizando el código de
        Microsoft Authenticator en cada acceso.
      </p>
    </Modal>
  );
};

export default AuthenticatorSetupModal;
