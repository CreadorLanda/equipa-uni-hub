import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { authAPI } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      const { token, user: userData } = response;
      
      // Armazena o token e dados do usuário
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Tenta fazer logout no servidor
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove dados locais independentemente do resultado
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      setIsLoading(false);
    }
  };

  // Verifica se o usuário está autenticado ao carregar a aplicação
  React.useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // Verifica se o token ainda é válido
          const userData = await authAPI.me();
          setUser(userData);
        } catch (error) {
          console.error('Token validation error:', error);
          // Token inválido, remove dados locais
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};