import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, MeResponse, PlanName } from '../lib/api';

interface AuthState {
  me: MeResponse | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (access: string, refresh: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ me: null, loading: true });

  const loadMe = async () => {
    try {
      const res = await api.get<MeResponse>('/auth/me');
      setState({ me: res.data, loading: false });
    } catch {
      setState({ me: null, loading: false });
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const login = async (access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await loadMe();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setState({ me: null, loading: false });
  };

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const usePlan = (): PlanName | null => {
  const { me } = useAuth();
  return me?.organization.plan ?? null;
};

