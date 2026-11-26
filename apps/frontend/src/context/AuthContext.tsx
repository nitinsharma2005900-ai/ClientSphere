// ClientSphere Authentication & Multi-Role Switching Context
// Developer: Nitin Sharma

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export type RoleType = 'ADMINISTRATOR' | 'SALES_MANAGER' | 'SALES_REPRESENTATIVE' | 'MARKETING_USER' | 'SUPPORT_USER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleType;
  department?: string;
  organizationId: string;
  organizationName?: string;
}

interface AuthContextType {
  user: User | null;
  role: RoleType;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: RoleType) => Promise<void>;
}

const roleCredentials: Record<RoleType, string> = {
  ADMINISTRATOR: 'admin@clientsphere.io',
  SALES_MANAGER: 'manager@clientsphere.io',
  SALES_REPRESENTATIVE: 'rep@clientsphere.io',
  MARKETING_USER: 'marketing@clientsphere.io',
  SUPPORT_USER: 'support@clientsphere.io',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('admin@clientsphere.io');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('clientsphere_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {
      localStorage.removeItem('clientsphere_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string = 'Password123!') => {
    try {
      setError('');
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      if (res.success && res.data?.tokens) {
        localStorage.setItem('clientsphere_token', res.data.tokens.accessToken);
        localStorage.setItem('clientsphere_refresh', res.data.tokens.refreshToken);
        queryClient.clear();
        setUser(res.data.user);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('clientsphere_refresh');
    void api.post('/auth/logout', { refreshToken });
    localStorage.removeItem('clientsphere_token');
    localStorage.removeItem('clientsphere_refresh');
    queryClient.clear();
    setUser(null);
  };

  const switchRole = async (targetRole: RoleType) => {
    const targetEmail = roleCredentials[targetRole];
    try { await login(targetEmail, 'Password123!'); } catch { return; }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  useEffect(() => {
    void fetchProfile();
    const expired = () => setUser(null);
    const failure = (event: Event) => setNotice((event as CustomEvent).detail);
    window.addEventListener('clientsphere-session-expired', expired);
    window.addEventListener('clientsphere-api-error', failure);
    return () => { window.removeEventListener('clientsphere-session-expired', expired); window.removeEventListener('clientsphere-api-error', failure); };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'ADMINISTRATOR',
        loading,
        login,
        logout,
        switchRole,
      }}
    >
      {loading && !user ? <div className="min-h-screen grid place-items-center bg-[#FAF9F0] text-violet-700">Connecting to ClientSphere...</div> : !user ? (
        <div className="min-h-screen grid place-items-center bg-[#FAF9F0] p-6">
          <form className="w-full max-w-md rounded-2xl bg-white border border-[#E2DCBF] p-8 shadow-xl space-y-5" onSubmit={event => { event.preventDefault(); void login(email, password).catch(() => {}); }}>
            <h1 className="text-3xl font-extrabold text-violet-700">ClientSphere</h1>
            <p className="text-gray-600">Sign in to your CRM workspace.</p>
            <label className="block text-sm">Email<input aria-label="Email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="block w-full mt-2 rounded-lg border p-3 text-gray-900" /></label>
            <label className="block text-sm">Password<input aria-label="Password" type="password" required value={password} onChange={event => setPassword(event.target.value)} className="block w-full mt-2 rounded-lg border p-3 text-gray-900" /></label>
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <button disabled={loading} type="submit" className="w-full rounded-xl bg-violet-600 text-white font-bold p-3">Sign in</button>
            <p className="text-xs text-gray-500">Demo workspace: admin@clientsphere.io / Password123!<br />Use the role selector after signing in to explore all five demo roles.</p>
          </form>
        </div>
      ) : <>{notice && <div role="alert" className="fixed z-50 bottom-4 right-4 max-w-md rounded-xl bg-red-50 border border-red-300 text-red-800 p-4 shadow-lg">{notice}<button onClick={() => setNotice('')} className="ml-3 font-bold" aria-label="Dismiss error">Dismiss</button></div>}{children}</>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
