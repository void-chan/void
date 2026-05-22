/**
 * src/context/AuthContext.jsx
 * Global auth state — username-based, no email.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ ok, data }) => { if (ok) setUser(data.data.user); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (username, password, adminPhrase) => {
    const { ok, data } = await api.post('/auth/login', {
      username,
      password,
      ...(adminPhrase ? { adminPhrase } : {}),
    });
    if (ok) { setUser(data.data.user); return { ok: true }; }
    return { ok: false, message: data.message };
  }, []);

  /**
   * register — returns { ok, recoveryPhrase } on success.
   * The caller is responsible for showing the phrase to the user.
   */
  const register = useCallback(async (username, password, challenge, nonce) => {
    const { ok, data } = await api.post('/auth/register', { username, password, challenge, nonce: Number(nonce) });
    if (ok) return { ok: true, recoveryPhrase: data.data.recoveryPhrase };
    return { ok: false, message: data.message };
  }, []);

  const recover = useCallback(async (username, recoveryPhrase, newPassword) => {
    const { ok, data } = await api.post('/auth/recover', { username, recoveryPhrase, newPassword });
    if (ok) return { ok: true, newRecoveryPhrase: data.data.newRecoveryPhrase };
    return { ok: false, message: data.message };
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, recover, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
