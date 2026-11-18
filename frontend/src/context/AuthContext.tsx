import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('outbreaklab_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('outbreaklab_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('outbreaklab_token', res.access_token);
    localStorage.setItem('outbreaklab_refresh', res.refresh_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName: string, role?: string) => {
    const res = await api.register({ email, password, full_name: fullName, role });
    localStorage.setItem('outbreaklab_token', res.access_token);
    localStorage.setItem('outbreaklab_refresh', res.refresh_token);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
