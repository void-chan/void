/**
 * src/pages/LoginPage.jsx
 *
 * Login form with client-side validation, error display, and loading state.
 * Credentials are posted to /api/auth/login → cookie is set by the server.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    const { ok, message } = await login(form.email, form.password);
    setLoading(false);

    if (!ok) setApiError(message ?? 'Login failed.');
    else onNavigate?.('dashboard');
  }

  const set = (key) => (ev) => setForm((f) => ({ ...f, [key]: ev.target.value }));

  return (
    <div className="auth-page animate-fade-in">
      <div className="card auth-card">
        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-sub">Welcome back. Enter your credentials below.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-stack">
            <Alert type="error">{apiError}</Alert>

            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
            />

            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              Sign in
            </Button>
          </div>
        </form>

        <p className="auth-footer">
          No account?{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => onNavigate?.('register')}
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
