/** src/components/layout/Navbar.jsx */
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export function Navbar({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <span className="nav-brand">App</span>

        <div className="nav-links">
          {user ? (
            <>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {user.email}
              </span>
              {user.role === 'admin' && (
                <span className="badge badge-accent">admin</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate?.('login')}
              >
                Sign in
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate?.('register')}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
