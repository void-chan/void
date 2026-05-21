/** src/pages/RegisterPage.jsx */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export function RegisterPage({ onNavigate }) {
  const { register } = useAuth();

  const [form, setForm]         = useState({ email: '', password: '', confirm: '' });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  function validate() {
    const e = {};
    if (!form.email)         e.email    = 'Email is required.';
    if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(form.password))
      e.password = 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(form.password))
      e.password = 'Password must contain a number.';
    if (form.password !== form.confirm)
      e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setApiError('');
    setSuccess('');
    if (!validate()) return;

    setLoading(true);
    const { ok, message } = await register(form.email, form.password);
    setLoading(false);

    if (!ok) setApiError(message ?? 'Registration failed.');
    else {
      setSuccess('Account created! Redirecting to sign in...');
      setTimeout(() => onNavigate?.('login'), 1500);
    }
  }

  const set = (key) => (ev) => setForm((f) => ({ ...f, [key]: ev.target.value }));

  return (
    <div className="auth-page animate-fade-in">
      <div className="card auth-card">
        <h1 className="auth-heading">Create account</h1>
        <p className="auth-sub">Set up your local account below.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-stack">
            <Alert type="error">{apiError}</Alert>
            <Alert type="success">{success}</Alert>

            <Input
              id="reg-email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
            />

            <Input
              id="reg-password"
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 chars, uppercase + number"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
            />

            <Input
              id="reg-confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={set('confirm')}
              error={errors.confirm}
            />

            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              Create account
            </Button>
          </div>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => onNavigate?.('login')}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
