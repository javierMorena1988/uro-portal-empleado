import { useState, useEffect, createContext, useContext } from 'react';
import * as authService from '../services/auth';

interface User {
  email: string;
  name: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  login: (usernameOrEmail: string, password: string, twoFactorCode?: string) => Promise<authService.LoginResponse>;
  logout: () => void;
  isLoading: boolean;
  changePassword: (username: string, oldPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado y validar la sesión
    const token = authService.getToken();
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Verificar si el token es válido
      authService.verifyToken(token)
        .then((response) => {
          if (response.success && response.user) {
            const userData = {
              email: response.user.email,
              name: response.user.displayName || response.user.username,
              username: response.user.username,
            };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Token inválido, limpiar sesión
            authService.removeToken();
            localStorage.removeItem('user');
          }
        })
        .catch(() => {
          // Error al verificar token, limpiar sesión
          authService.removeToken();
          localStorage.removeItem('user');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (
    usernameOrEmail: string, 
    password: string, 
    twoFactorCode?: string
  ): Promise<authService.LoginResponse> => {
    setIsLoading(true);
    
    try {
      // Usar el servicio de autenticación real con LDAP
      const response = await authService.login(usernameOrEmail, password, twoFactorCode);
      
      // Si requiere 2FA, no es un error, solo necesitamos el código
      if (response.requiresTwoFactor) {
        setIsLoading(false);
        return response;
      }
      
      if (response.success && response.token && response.user) {
        // Guardar token y datos del usuario
        authService.saveToken(response.token);
        const userData = {
          email: response.user.email,
          name: response.user.name,
          username: response.user.username,
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsLoading(false);
        return response;
      } else {
        setIsLoading(false);
        return response;
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return {
        success: false,
        error: 'Error de conexión con el servidor',
      };
    }
  };

  const changePassword = async (
    username: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      const response = await authService.changePassword(username, oldPassword, newPassword);
      return response.success;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    authService.removeToken();
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
