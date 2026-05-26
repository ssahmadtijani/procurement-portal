'use client';

import {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'BUYER' | 'SUPPLIER_COMPANY';
  status: string;
  plan: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  organizationId?: string;
  organization?: Organization;
  supplierProfile?: { id: string; companyName: string; status: string } | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getDashboardPath(user: User): string {
  if (user.role === 'PLATFORM_ADMIN') return '/platform/dashboard';
  const slug = user.organization?.slug;
  if (!slug) return '/onboarding';
  return `/org/${slug}/dashboard`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: loggedIn, accessToken } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(loggedIn);
    router.push(getDashboardPath(loggedIn));
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => null);
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => { await fetchMe(); };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
