import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { authAPI } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStoredToken = () =>
  localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

const readStoredUser = () =>
  localStorage.getItem('user') || sessionStorage.getItem('user');

const clearStoredSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user');
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Enquanto a sessao guardada nao for validada nao se pode decidir rotas,
  // caso contrario um refresh atira o utilizador para fora da pagina atual.
  const [isInitializing, setIsInitializing] = useState(true);

  const login = async (email: string, password: string, remember = true): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      const { token, user: userData } = response;

      // Com "Lembrar-me" a sessao persiste entre visitas (localStorage);
      // sem ele termina ao fechar o separador (sessionStorage).
      clearStoredSession();
      const store = remember ? localStorage : sessionStorage;
      store.setItem('auth_token', token);
      store.setItem('user', JSON.stringify(userData));

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
      clearStoredSession();
      setUser(null);
      setIsLoading(false);
    }
  };

  // Verifica se o usuário está autenticado ao carregar a aplicação
  React.useEffect(() => {
    const initializeAuth = async () => {
      const token = readStoredToken();
      const savedUser = readStoredUser();

      if (token && savedUser) {
        try {
          // Verifica se o token ainda é válido
          const userData = await authAPI.me();
          setUser(userData);
        } catch (error) {
          console.error('Token validation error:', error);
          // Token inválido, remove dados locais
          clearStoredSession();
        }
      }

      setIsInitializing(false);
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    isInitializing
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