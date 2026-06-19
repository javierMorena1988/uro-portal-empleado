import React from 'react';
import Modal from '../common/Modal';
import './AuthenticatorModals.css';

interface AuthenticatorLoginHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthenticatorLoginHelpModal: React.FC<AuthenticatorLoginHelpModalProps> = ({
  open,
  onClose,
}) => {
  const footer = (
    <button type="button" className="auth-modal-footer-btn" onClick={onClose}>
      Cerrar
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cómo acceder con Microsoft Authenticator"
      footer={footer}
    >
      <section className="auth-modal-section">
        <h3>Código de acceso (6 dígitos)</h3>
        <p>
          Después de introducir tu correo y contraseña, el portal te pedirá un código de
          verificación. Este portal utiliza un <strong>código temporal de 6 dígitos</strong>{' '}
          generado en Microsoft Authenticator.
        </p>
        <ol>
          <li>Abre <strong>Microsoft Authenticator</strong> en tu móvil.</li>
          <li>Selecciona la cuenta del Portal Empleado UROVESA.</li>
          <li>Localiza el código de 6 dígitos que se renueva cada 30 segundos.</li>
          <li>Introduce el código en el portal antes de que expire.</li>
        </ol>
      </section>

      <section className="auth-modal-section">
        <h3>Si el código no funciona</h3>
        <ul>
          <li>Comprueba que la hora de tu móvil esté sincronizada automáticamente.</li>
          <li>Espera a que aparezca un código nuevo si el anterior está a punto de caducar.</li>
          <li>Asegúrate de tener seleccionada la cuenta correcta en la app.</li>
        </ul>
      </section>

      <section className="auth-modal-section">
        <h3>¿Has cambiado de móvil?</h3>
        <p>
          Si has cambiado de dispositivo o has reinstalado Microsoft Authenticator, es posible
          que necesites volver a configurar el doble factor. Contacta con el administrador del
          sistema para restablecer tu acceso.
        </p>
      </section>

      <p className="auth-modal-note">
        El acceso a este portal se realiza siempre mediante el código de 6 dígitos de
        Microsoft Authenticator, no mediante notificaciones push.
      </p>
    </Modal>
  );
};

export default AuthenticatorLoginHelpModal;
