import type React from 'react';

export const OTP_INPUT_STYLE: React.CSSProperties = {
  width: '3rem',
  height: '3rem',
  margin: '0 0.25rem',
  fontSize: '1.25rem',
  borderRadius: '4px',
  border: '1px solid #ccc',
  textAlign: 'center',
  color: '#111',
  backgroundColor: '#fff',
};

export const renderNumericOtpInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`otp-digit-input ${props.className || ''}`.trim()}
    inputMode="numeric"
    pattern="[0-9]*"
    autoComplete="one-time-code"
  />
);

export const sanitizeOtpValue = (value: string) => value.replace(/\D/g, '').slice(0, 6);
