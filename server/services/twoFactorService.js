import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/**
 * Servicio para autenticación de doble factor (2FA) usando TOTP
 */

/**
 * Genera un secreto TOTP para un usuario
 * @param {string} username - Nombre de usuario
 * @param {string} issuer - Nombre de la aplicación (ej: "Portal Empleado UROVESA")
 * @returns {Object} Objeto con el secreto y la URL para generar el QR
 */
export function generateSecret(username, issuer = 'Portal Empleado UROVESA') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${username})`,
    issuer,
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Genera un código QR en formato data URL para mostrar en el frontend
 * @param {string} otpauthUrl - URL de autenticación OTP
 * @returns {Promise<string>} Data URL del QR code
 */
export async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(`Error generando QR code: ${error.message}`);
  }
}

/**
 * Verifica un código TOTP
 * @param {string} secret - Secreto base32 del usuario
 * @param {string} token - Código de 6 dígitos ingresado por el usuario
 * @returns {boolean} true si el código es válido
 */
export function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Permite un margen de ±2 períodos de tiempo (60 segundos cada uno)
  });
}

/**
 * Genera un código TOTP temporal (útil para testing)
 * @param {string} secret - Secreto base32
 * @returns {string} Código de 6 dígitos
 */
export function generateToken(secret) {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}








