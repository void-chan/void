/**
 * src/pages/RecoverPage.jsx
 *
 * Account recovery via 12-word phrase.
 * On success: new recovery phrase is generated and shown.
 */
import { useState } from 'react';
import { useAuth }  from '../context/AuthContext';
import { Input }    from '../components/ui/Input';
import { Button }   from '../components/ui/Button';
import { Alert }    from '../components/ui/Alert';

export function RecoverPage({ onNavigate }) {
  const { recover } = useAuth();

  const [step, setStep] = useState('form'); // 'form' | 'newphrase'
  const [form, setForm] = useState({ username: '', recoveryPhrase: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors]   = useState({});
  const [alert, setAlert]     = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const set = (k) => (ev) => setForm(f => ({ ...f, [k]: ev.target.value }));

  function validate() {
    const e = {};
    if (!form.username.trim())       e.username       = 'Username required.';
    if (!form.recoveryPhrase.trim()) e.recoveryPhrase = 'Recovery phrase required.';
    if (form.newPassword.length < 8) e.newPassword    = 'Min 8 characters.';
    else if (!/[A-Z]/.test(form.newPassword)) e.newPassword = 'Must contain uppercase.';
    else if (!/[0-9]/.test(form.newPassword)) e.newPassword = 'Must contain a number.';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setAlert({ text: '', type: 'info' });
    if (!validate()) return;
    setLoading(true);
    const result = await recover(form.username, form.recoveryPhrase, form.newPassword);
    setLoading(false);
    if (!result.ok) {
      setAlert({ text: result.message ?? 'Recovery failed.', type: 'error' });
    } else {
      setNewPhrase(result.newRecoveryPhrase);
      setStep('newphrase');
    }
  }

  function handleConfirmNewPhrase(ev) {
    ev.preventDefault();
    const typed  = confirmInput.trim().toLowerCase().replace(/\s+/g, ' ');
    const actual = newPhrase.toLowerCase().trim();
    if (typed !== actual) {
      setAlert({ text: 'Phrase does not match. Check each word.', type: 'error' });
      return;
    }
    setConfirmed(true);
    setTimeout(() => onNavigate?.('login'), 2000);
  }

  // ── Show new recovery phrase ─────────────────────────────────────────────────
  if (step === 'newphrase') {
    const words = newPhrase.split(' ');

    if (confirmed) {
      return (
        <div className="auth-page">
          <div className="panel auth-card animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <div className="auth-heading">Password Reset</div>
            <div style={{ color: 'var(--green-muted)', fontSize: 'var(--text-sm)' }}>
              Redirecting to login...
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="auth-page">
        <div className="panel auth-card animate-fade-in" style={{ maxWidth: 560 }}>
          <div className="auth-heading">⚠ New Recovery Phrase</div>
          <div style={{ color: 'var(--amber)', fontSize: 'var(--text-sm)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Your old phrase is <strong>now invalid</strong>. This is your <strong>new</strong> recovery phrase.
            Save it immediately — it will not be shown again.
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem', marginBottom: '1.5rem',
            padding: '1rem', background: 'var(--bg-deep)',
            border: '1px solid var(--amber)', borderRadius: '4px',
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.6rem',
                background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
              }}>
                <span style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-xs)', minWidth: '1.2rem' }}>{i + 1}.</span>
                <span style={{ color: 'var(--green)', fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' }}>{word}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleConfirmNewPhrase} className="form-stack">
            <Alert type={alert.type}>{alert.text}</Alert>
            <div className="field">
              <label className="label" htmlFor="new-phrase-confirm">
                Type your new phrase to confirm you saved it:
              </label>
              <textarea
                id="new-phrase-confirm"
                className="input"
                rows={3}
                placeholder="word1 word2 ... word12"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                style={{ fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', resize: 'vertical' }}
              />
            </div>
            <Button type="submit" style={{ width: '100%' }}>
              I HAVE SAVED IT — GO TO LOGIN
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Form step ────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="panel auth-card animate-fade-in">
        <div className="auth-heading">Recover Account</div>
        <div className="auth-sub">Reset password using your 12-word recovery phrase.</div>

        <form onSubmit={handleSubmit} noValidate className="form-stack">
          <Alert type={alert.type}>{alert.text}</Alert>

          <Input
            id="rec-username"
            label="Username"
            autoComplete="username"
            placeholder="your_username"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
          />

          <div className="field">
            <label className="label" htmlFor="rec-phrase">Recovery Phrase (12 words)</label>
            <textarea
              id="rec-phrase"
              className={`input ${errors.recoveryPhrase ? 'is-error' : ''}`}
              rows={3}
              placeholder="word1 word2 word3 ... word12"
              value={form.recoveryPhrase}
              onChange={set('recoveryPhrase')}
              style={{ fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', resize: 'vertical' }}
            />
            {errors.recoveryPhrase && <span className="field-error">{errors.recoveryPhrase}</span>}
          </div>

          <Input
            id="rec-newpass"
            label="New Password"
            type="password"
            autoComplete="new-password"
            placeholder="Min 8 chars, uppercase + number"
            value={form.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
          />
          <Input
            id="rec-confirm"
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat new password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
          />

          <Button type="submit" loading={loading} style={{ width: '100%' }}>
            RESET PASSWORD
          </Button>
        </form>

        <div className="auth-footer">
          Remember it?{' '}
          <button className="link-btn" onClick={() => onNavigate?.('login')}>BACK TO LOGIN</button>
        </div>
      </div>
    </div>
  );
}
