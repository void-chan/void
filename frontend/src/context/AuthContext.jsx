/**
 * src/context/AuthContext.jsx
 *
 * Global authentication state using React Context.
 *
 * WHY Context instead of Zustand/Redux:
 *  - Auth state is app-wide but simple (user/loading/handlers)
 *  - Zero extra dependencies for this use case
 *  - Easy to swap to Zustand later if state grows complex
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    api.get('/auth/me')
      .then(({ ok, data }) => {
        if (ok) setUser(data.data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  // Listen for auth:logout events (triggered by API client on refresh failure)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const { ok, data } = await api.post('/auth/login', { email, password });
    if (ok) {
      setUser(data.data.user);
      return { ok: true };
    }
    return { ok: false, message: data.message };
  }, []);

  const register = useCallback(async (email, password) => {
    const { ok, data } = await api.post('/auth/register', { email, password });
    return { ok, message: data.message };
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume auth context — throws if used outside AuthProvider */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
