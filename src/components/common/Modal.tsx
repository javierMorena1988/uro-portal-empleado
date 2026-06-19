import React from 'react';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md';
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="app-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        className={`app-modal-content app-modal-content--${maxWidth}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal-header">
          <h2 id="app-modal-title" className="app-modal-title">{title}</h2>
          <button
            type="button"
            className="app-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
        {footer && <div className="app-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
