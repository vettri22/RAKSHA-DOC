import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DEPT_ADMIN' | 'RECIPIENT' | 'INVESTIGATOR';
  department_id?: string;
  department_name?: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('raksha_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('raksha_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('raksha_user');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('raksha_token'));

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (active) {
        setUser(res.data);
        localStorage.setItem('raksha_user', JSON.stringify(res.data));
      }
    }).catch(err => {
      if (active && err.response?.status === 401) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('raksha_token');
        localStorage.removeItem('raksha_user');
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [token]);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('raksha_token', newToken);
    localStorage.setItem('raksha_user', JSON.stringify(newUser));
  };

  const logout = () => {
    if (token) {
      void axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('raksha_token');
    localStorage.removeItem('raksha_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
