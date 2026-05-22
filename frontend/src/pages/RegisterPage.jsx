/**
 * src/pages/RegisterPage.jsx
 *
 * 3-step anonymous registration:
 *  Step 1 — Enter username + password
 *  Step 2 — Client solves PoW challenge (anti-spam, ~2-3s)
 *  Step 3 — Server returns 12-word recovery phrase, user confirms they saved it
 */
import { useState, useCallback, useRef } from 'react';
import { useAuth }  from '../context/AuthContext';
import { api }      from '../services/api';
import { Input }    from '../components/ui/Input';
import { Button }   from '../components/ui/Button';
import { Alert }    from '../components/ui/Alert';

// ── Client-side PoW solver ────────────────────────────────────────────────────
async function solveChallenge(challenge, difficulty) {
  let nonce = 0;
  const target = '0'.repeat(difficulty);
  while (true) {
    const msgBuffer = new TextEncoder().encode(challenge + String(nonce));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    const hashHex    = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if (hashHex.startsWith(target)) return nonce;
    nonce++;
    // Yield to browser every 5000 iterations to keep UI responsive
    if (nonce % 5000 === 0) await new Promise(r => setTimeout(r, 0));
  }
}

export function RegisterPage({ onNavigate }) {
  const { register } = useAuth();

  // Step tracking: 'form' | 'solving' | 'phrase' | 'confirm'
  const [step, setStep] = useState('form');

  // Form fields
  const [form, setForm]       = useState({ username: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState({});
  const [alert, setAlert]     = useState({ text: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  // PoW + phrase state
  const [powProgress, setPowProgress] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [confirmPhrase, setConfirmPhrase]   = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  const handleCopyPhrase = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard
      const ta = document.createElement('textarea');
      ta.value = recoveryPhrase;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [recoveryPhrase]);

  const set = (k) => (ev) => setForm(f => ({ ...f, [k]: ev.target.value }));

  function validate() {
    const e = {};
    if (!form.username.trim()) {
      e.username = 'Username required.';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      e.username = '3–20 chars, letters/numbers/underscore only.';
    }
    if (form.password.length < 8)       e.password = 'Min 8 characters.';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain uppercase letter.';
    else if (!/[0-9]/.test(form.password)) e.password = 'Must contain a number.';
    if (form.password !== form.confirm)  e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = useCallback(async (ev) => {
    ev.preventDefault();
    setAlert({ text: '', type: 'info' });
    if (!validate()) return;

    setLoading(true);
    setStep('solving');

    try {
      // 1. Get challenge from server
      setPowProgress('Requesting identity challenge...');
      const { ok: cOk, data: cData } = await api.get('/auth/challenge');
      if (!cOk) throw new Error(cData.message ?? 'Failed to get challenge.');

      const { challenge, difficulty } = cData.data;

      // 2. Solve PoW
      setPowProgress(`Solving identity puzzle (difficulty ${difficulty})...`);
      const nonce = await solveChallenge(challenge, difficulty);
      setPowProgress('Puzzle solved! Creating account...');

      // 3. Register
      const result = await register(form.username, form.password, challenge, nonce);
      if (!result.ok) throw new Error(result.message ?? 'Registration failed.');

      setRecoveryPhrase(result.recoveryPhrase);
      setStep('phrase');
    } catch (err) {
      setAlert({ text: err.message, type: 'error' });
      setStep('form');
    } finally {
      setLoading(false);
      setPowProgress('');
    }
  }, [form, register]);

  function handleConfirmPhrase(ev) {
    ev.preventDefault();
    const typed = confirmPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
    const actual = recoveryPhrase.toLowerCase().trim();
    if (typed !== actual) {
      setAlert({ text: 'Phrase does not match. Check each word carefully.', type: 'error' });
      return;
    }
    setStep('confirm');
    setTimeout(() => onNavigate?.('login'), 2200);
  }

  // ── STEP: solving PoW ────────────────────────────────────────────────────────
  if (step === 'solving') {
    return (
      <div className="auth-page">
        <div className="panel auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div className="auth-heading">Creating Identity</div>
          <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite' }}>⚙</div>
            <div style={{ color: 'var(--green-muted)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font)' }}>
              {powProgress}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-dim)' }}>
              This prevents automated spam accounts. Takes 2–5 seconds.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: show recovery phrase ───────────────────────────────────────────────
  if (step === 'phrase') {
    const words = recoveryPhrase.split(' ');
    return (
      <div className="auth-page">
        <div className="panel auth-card animate-fade-in" style={{ maxWidth: 560 }}>
          <div className="auth-heading">⚠ Save Your Recovery Phrase</div>
          <div style={{ color: 'var(--amber)', fontSize: 'var(--text-sm)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            This is your <strong>only way to recover your account</strong> if you forget your password.
            It will <strong>never be shown again</strong>. Write it down somewhere safe.
          </div>

          {/* Phrase grid */}
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
                <span style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-xs)', minWidth: '1.2rem' }}>
                  {i + 1}.
                </span>
                <span style={{ color: 'var(--green)', fontFamily: 'var(--font)', fontSize: 'var(--text-sm)' }}>
                  {word}
                </span>
              </div>
            ))}
          </div>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopyPhrase}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              width: '100%',
              padding: '0.55rem 1rem',
              marginBottom: '0.75rem',
              background: copied ? 'var(--green)' : 'var(--bg-panel)',
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: '4px',
              color: copied ? 'var(--bg-deep)' : 'var(--fg)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
          >
            {copied ? (
              <>
                <span style={{ fontSize: '1rem' }}>✓</span>
                Copied!
              </>
            ) : (
              <>
                <span style={{ fontSize: '1rem' }}>⎘</span>
                Copy Phrase
              </>
            )}
          </button>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-dim)', marginBottom: '1.25rem' }}>
            Store it in a password manager, write on paper, or memorise. Do not take a screenshot.
          </div>

          {/* Confirm by retyping */}
          <form onSubmit={handleConfirmPhrase} className="form-stack">
            <Alert type={alert.type}>{alert.text}</Alert>
            <div className="field">
              <label className="label" htmlFor="confirm-phrase">
                Type your phrase to confirm you saved it:
              </label>
              <textarea
                id="confirm-phrase"
                className="input"
                rows={3}
                placeholder="word1 word2 word3 ... word12"
                value={confirmPhrase}
                onChange={e => setConfirmPhrase(e.target.value)}
                style={{ fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', resize: 'vertical' }}
              />
            </div>
            <Button type="submit" style={{ width: '100%' }}>
              I HAVE SAVED IT — CONTINUE
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── STEP: confirmed ──────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="auth-page">
        <div className="panel auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <div className="auth-heading">Account Created</div>
          <div style={{ color: 'var(--green-muted)', fontSize: 'var(--text-sm)' }}>
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: form (default) ─────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="panel auth-card animate-fade-in">
        <div className="auth-heading">Create Account</div>
        <div className="auth-sub">No email. No verification. Completely anonymous.</div>

        <form onSubmit={handleSubmit} noValidate className="form-stack">
          <Alert type={alert.type}>{alert.text}</Alert>

          <Input
            id="reg-username"
            label="Username"
            autoComplete="username"
            placeholder="3–20 chars, letters/numbers/underscore"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
          />
          <Input
            id="reg-pass"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Min 8 chars, uppercase + number"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
          <Input
            id="reg-confirm"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />

          <div style={{
            fontSize: 'var(--text-xs)', color: 'var(--fg-dim)',
            padding: '0.6rem', background: 'var(--bg-panel)',
            border: '1px solid var(--border-dim)',
          }}>
            ℹ After creating your account you will receive a <strong>12-word recovery phrase</strong>.
            This is your only way to reset your password. Save it securely.
          </div>

          <Button type="submit" loading={loading} style={{ width: '100%' }}>
            CREATE ACCOUNT
          </Button>
        </form>

        <div className="auth-footer">
          Have account?{' '}
          <button className="link-btn" onClick={() => onNavigate?.('login')}>LOGIN</button>
        </div>
      </div>
    </div>
  );
}
