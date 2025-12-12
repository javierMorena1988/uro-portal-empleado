/**
 * Servicio de autenticación para comunicación con el backend LDAP
 */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    username: string;
    email: string;
    name: string;
  };
  requiresTwoFactor?: boolean;
  requires2FASetup?: boolean;
  message?: string;
  error?: string;
}

export interface ChangePasswordRequest {
  username: string;
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  user?: {
    username: string;
    email: string;
    displayName: string;
  };
  error?: string;
}

/**
 * Autentica un usuario contra LDAP/Active Directory
 * @param username - Nombre de usuario (puede ser email o nombre de usuario)
 * @param password - Contraseña del usuario
 * @param twoFactorCode - Código de 6 dígitos de 2FA (opcional)
 * @returns Respuesta con token JWT y datos del usuario
 */
export async function login(
  username: string, 
  password: string, 
  twoFactorCode?: string
): Promise<LoginResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, twoFactorCode }),
    });

    const data = await response.json();

    // Si requiere 2FA o configuración de 2FA, devolver la respuesta aunque success sea false
    if (data.requiresTwoFactor || data.requires2FASetup) {
      return data as LoginResponse;
    }

    // Si hay error y no requiere 2FA, devolver error
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al autenticar usuario',
      };
    }

    return data as LoginResponse;
  } catch (error) {
    console.error('Error en login:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Cambia la contraseña de un usuario en LDAP/Active Directory
 * @param username - Nombre de usuario
 * @param oldPassword - Contraseña actual
 * @param newPassword - Nueva contraseña
 * @returns Respuesta con el resultado de la operación
 */
export async function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> {
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, oldPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al cambiar la contraseña',
      };
    }

    return data as ChangePasswordResponse;
  } catch (error) {
    console.error('Error en changePassword:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Verifica un token JWT
 * @param token - Token JWT a verificar
 * @returns Respuesta con los datos del usuario si el token es válido
 */
export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Token inválido',
      };
    }

    return data as VerifyTokenResponse;
  } catch (error) {
    console.error('Error en verifyToken:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Guarda el token JWT en localStorage
 */
export function saveToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

/**
 * Obtiene el token JWT de localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Elimina el token JWT de localStorage
 */
export function removeToken(): void {
  localStorage.removeItem('auth_token');
}

// ==================== 2FA FUNCTIONS ====================

export interface Setup2FAResponse {
  success: boolean;
  secret?: string;
  qrCode?: string;
  otpauth_url?: string;
  error?: string;
}

export interface Verify2FAResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TwoFactorStatusResponse {
  success: boolean;
  enabled: boolean;
  error?: string;
}

/**
 * Configura 2FA para un usuario (genera secreto y QR code)
 * @param username - Nombre de usuario
 * @param password - Contraseña (opcional, requerida si el usuario no tiene 2FA configurado)
 * @returns Respuesta con QR code y secreto
 */
export async function setup2FA(username: string, password?: string): Promise<Setup2FAResponse> {
  try {
    const response = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, ...(password && { password }) }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al configurar 2FA',
      };
    }

    return data as Setup2FAResponse;
  } catch (error) {
    console.error('Error en setup2FA:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Verifica un código 2FA y habilita 2FA para el usuario
 * @param username - Nombre de usuario
 * @param code - Código de 6 dígitos
 * @returns Respuesta con el resultado
 */
export async function verify2FA(username: string, code: string): Promise<Verify2FAResponse> {
  try {
    const response = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al verificar código 2FA',
      };
    }

    return data as Verify2FAResponse;
  } catch (error) {
    console.error('Error en verify2FA:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Verifica si un usuario tiene 2FA habilitado
 * @param username - Nombre de usuario
 * @returns Respuesta con el estado de 2FA
 */
export async function get2FAStatus(username: string): Promise<TwoFactorStatusResponse> {
  try {
    const response = await fetch(`/api/auth/2fa/status?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        enabled: false,
        error: data.error || 'Error al verificar estado 2FA',
      };
    }

    return data as TwoFactorStatusResponse;
  } catch (error) {
    console.error('Error en get2FAStatus:', error);
    return {
      success: false,
      enabled: false,
      error: 'Error de conexión con el servidor',
    };
  }
}


