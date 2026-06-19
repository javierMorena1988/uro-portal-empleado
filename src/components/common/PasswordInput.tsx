import React, { forwardRef, useState } from 'react';
import './PasswordInput.css';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputClassName?: string;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ inputClassName = '', className = '', ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className={`password-input-wrapper ${className}`.trim()}>
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={inputClassName}
        />
        <button
          type="button"
          className="password-input-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
