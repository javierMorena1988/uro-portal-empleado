/**
 * Servicio de administración para gestión de usuarios
 */

import { API_BASE_URL } from '../config/api';
import { getToken } from './auth';

export interface User {
  username: string;
  email: string;
  displayName: string;
  dn?: string;
}

export interface UsersListResponse {
  success: boolean;
  users: User[];
  total: number;
  mode: 'mock' | 'ldap';
  message?: string;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user: User;
  error?: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface ResetPasswordRequest {
  sendEmail?: boolean;
}

export interface AdminResponse {
  success: boolean;
  message?: string;
  error?: string;
  password?: string;
  warning?: string;
  email?: string;
}

/**
 * Obtiene el token de autenticación
 */
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

/**
 * Lista todos los usuarios (solo admin)
 */
export async function getUsers(): Promise<UsersListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        users: [],
        total: 0,
        mode: 'mock',
        error: data.error || 'Error al obtener usuarios',
      };
    }

    return data as UsersListResponse;
  } catch (error) {
    console.error('Error en getUsers:', error);
    return {
      success: false,
      users: [],
      total: 0,
      mode: 'mock',
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Obtiene información de un usuario específico (solo admin)
 */
export async function getUser(username: string): Promise<UserResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        user: { username, email: '', displayName: '' },
        error: data.error || 'Error al obtener usuario',
      };
    }

    return data as UserResponse;
  } catch (error) {
    console.error('Error en getUser:', error);
    return {
      success: false,
      user: { username, email: '', displayName: '' },
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Cambia la contraseña de un usuario (solo admin)
 */
export async function changeUserPassword(
  username: string,
  newPassword: string
): Promise<AdminResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(username)}/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al cambiar contraseña',
      };
    }

    return data as AdminResponse;
  } catch (error) {
    console.error('Error en changeUserPassword:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Resetea la contraseña de un usuario y la envía por email (solo admin)
 */
export async function resetUserPassword(
  username: string,
  sendEmail: boolean = true
): Promise<AdminResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(username)}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sendEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al resetear contraseña',
      };
    }

    return data as AdminResponse;
  } catch (error) {
    console.error('Error en resetUserPassword:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}

/**
 * Elimina un usuario (solo admin, solo en modo MOCK)
 */
export async function deleteUser(username: string): Promise<AdminResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Error al eliminar usuario',
      };
    }

    return data as AdminResponse;
  } catch (error) {
    console.error('Error en deleteUser:', error);
    return {
      success: false,
      error: 'Error de conexión con el servidor',
    };
  }
}
