/**
 * src/pages/LoginPage.jsx
 */
import { useState } from 'react';
import { useAuth }  from '../context/AuthContext';
import { Input }    from '../components/ui/Input';
import { Button }   from '../components/ui/Button';
import { Alert }    from '../components/ui/Alert';

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm]         = useState({ username: '', password: '', adminPhrase: '' });
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = 'Username required.';
    if (!form.password)        e.password = 'Password required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    const { ok, message } = await login(form.username, form.password, form.adminPhrase || undefined);
    setLoading(false);
    if (!ok) setApiError(message ?? 'Login failed.');
    else onNavigate?.('home');
  }

  const set = (k) => (ev) => setForm(f => ({ ...f, [k]: ev.target.value }));

  return (
    <div className="auth-page">
      <div className="panel auth-card animate-fade-in">
        <div className="auth-heading cursor">Login</div>
        <div className="auth-sub">Identification required to proceed.</div>

        <form onSubmit={handleSubmit} noValidate className="form-stack">
          <Alert type="error">{apiError}</Alert>
          <Input
            id="login-username"
            label="Username"
            autoComplete="username"
            placeholder="your_username"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
          />
          <Input
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />

          {/* Admin second-factor — hidden by default */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdminKey(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: showAdminKey ? '#ff4444' : 'var(--fg-dim)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                padding: '0.25rem 0',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: 0.7,
                transition: 'color 0.2s, opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
            >
              {showAdminKey ? '▲ hide admin key' : '▼ admin key'}
            </button>

            {showAdminKey && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                border: '1px solid #660000',
                borderRadius: '4px',
                background: 'rgba(40,0,0,0.35)',
              }}>
                <Input
                  id="login-admin-phrase"
                  label="🔒 Admin phrase"
                  type="password"
                  autoComplete="off"
                  placeholder="Required for admin accounts only"
                  value={form.adminPhrase}
                  onChange={set('adminPhrase')}
                />
              </div>
            )}
          </div>

          <Button type="submit" loading={loading} style={{ width: '100%' }}>
            AUTHENTICATE
          </Button>
        </form>

        <div className="auth-footer">
          No account?{' '}
          <button className="link-btn" onClick={() => onNavigate?.('register')}>REGISTER</button>
          {' '}:: Forgot password?{' '}
          <button className="link-btn" onClick={() => onNavigate?.('recover')}>USE RECOVERY PHRASE</button>
          {' '}:: Or{' '}
          <button className="link-btn" onClick={() => onNavigate?.('chat')}>ENTER CHAT ANON</button>
        </div>
      </div>
    </div>
  );
}
