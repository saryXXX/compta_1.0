/**
 * Auth Context: Session & Multi-Tenant Context Manager.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant } from '../types/index.js';

interface AuthContextType {
  user?: User;
  token?: string;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<boolean>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  login: () => {},
  logout: async () => {},
  switchTenant: async () => false,
  authFetch: async () => new Response(),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [token, setToken] = useState<string | undefined>(() => {
    return localStorage.getItem('auth_token') || undefined;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authenticated fetch wrapper
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token expired or invalid
          setToken(undefined);
          setUser(undefined);
          localStorage.removeItem('auth_token');
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
  };

  const logout = async () => {
    try {
      if (token) {
        await authFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken(undefined);
      setUser(undefined);
      localStorage.removeItem('auth_token');
    }
  };

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    try {
      const res = await authFetch('/api/auth/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        // Refresh me
        const meRes = await authFetch('/api/auth/me');
        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Switch tenant error:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchTenant,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

