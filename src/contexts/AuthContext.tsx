import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    email: 'tecnico@universidade.edu',
    role: 'tecnico',
    department: 'TI'
  },
  {
    id: '2',
    name: 'Ana Santos',
    email: 'docente@universidade.edu',
    role: 'docente',
    department: 'Engenharia'
  },
  {
    id: '3',
    name: 'João Oliveira',
    email: 'secretario@universidade.edu',
    role: 'secretario',
    department: 'Administração'
  },
  {
    id: '4',
    name: 'Maria Costa',
    email: 'coordenador@universidade.edu',
    role: 'coordenador',
    department: 'Coordenação Acadêmica'
  }
];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser && password === '123456') { // Simple mock authentication
      setUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Load user from localStorage on app start
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user
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