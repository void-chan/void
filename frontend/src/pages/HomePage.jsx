/** src/pages/HomePage.jsx */
import { Button } from '../components/ui/Button';

export function HomePage({ onNavigate }) {
  return (
    <div className="home-page animate-fade-in">
      <div className="hero">
        <div className="hero-badge">
          <span className="badge badge-accent">Local-first · Private · Secure</span>
        </div>
        <h1 className="hero-title">
          Clean foundation.<br />
          <span className="hero-accent">Built right from day one.</span>
        </h1>
        <p className="hero-sub">
          A minimal, security-focused full-stack base. No trackers, no telemetry,
          no unnecessary dependencies — just solid architecture ready to extend.
        </p>
        <div className="hero-actions">
          <Button size="lg" onClick={() => onNavigate?.('register')}>
            Get started
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onNavigate?.('login')}>
            Sign in
          </Button>
        </div>
      </div>

      <div className="features container">
        {[
          { icon: '🔐', title: 'JWT + HTTP-only cookies', desc: 'Tokens stored in HttpOnly cookies — invisible to JavaScript, resilient to XSS.' },
          { icon: '🗄️', title: 'SQLite local-first', desc: 'Zero infrastructure. Database is a single file in your project. No cloud required.' },
          { icon: '📁', title: 'Secure file uploads', desc: 'UUID filenames, MIME allowlist, size limits, and path traversal prevention.' },
          { icon: '🛡️', title: 'Security by default', desc: 'Helmet headers, CORS, rate limiting, input validation, and sensitive log redaction.' },
          { icon: '⚡', title: 'React + Vite + Express', desc: 'Modern, fast toolchain with a clean separation between frontend and backend.' },
          { icon: '🔒', title: 'No external services', desc: 'No analytics, no tracking, no social login, no third-party APIs.' },
        ].map((f) => (
          <div key={f.title} className="feature-card card">
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
