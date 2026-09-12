'use client';

import type { User } from '@cc-ops/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name?: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  csrfToken: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/cc-ops-csrf-token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return null;
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const csrfToken = getCsrfToken();
  const headers = new Headers(init?.headers);
  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }
  return fetch(url, { ...init, headers, credentials: 'include' });
}

async function attemptRefreshToken(): Promise<boolean> {
  try {
    const res = await authFetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
    });
    if (res.ok) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Bootstrap session: check cookies on mount by hitting /me
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/v1/auth/me`);
        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
        }
      } catch {
        // Not authenticated — that's fine
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // cookie set by server
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const json = await res.json();
    setUser(json.data.user);
    setCsrfToken(json.data.csrfToken);
  }, []);

  const register = useCallback(async (data: { name?: string; email: string; password: string }) => {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const json = await res.json();
    setUser(json.data.user);
    setCsrfToken(json.data.csrfToken);
  }, []);

  const logout = useCallback(async () => {
    await authFetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
    });
    setUser(null);
    setCsrfToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await authFetch(`${API_URL}/api/v1/auth/me`);
    if (res.ok) {
      const json = await res.json();
      setUser(json.data);
    } else if (res.status === 401) {
      // Token expired — try refresh
      const refreshed = await attemptRefreshToken();
      if (refreshed) {
        // Set a new CSRF token from the refreshed cookie
        setCsrfToken(getCsrfToken());
        const meRes = await authFetch(`${API_URL}/api/v1/auth/me`);
        if (meRes.ok) {
          const json = await meRes.json();
          setUser(json.data);
        }
      } else {
        setUser(null);
        setCsrfToken(null);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser, csrfToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
