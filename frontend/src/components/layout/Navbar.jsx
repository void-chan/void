/** src/components/layout/Navbar.jsx */
import { useAuth } from '../../context/AuthContext';

export function Navbar({ onNavigate, currentPage }) {
  const { user, logout } = useAuth();

  const navLink = (page, label) => (
    <button
      className={`nav-link ${currentPage === page ? 'active' : ''}`}
      onClick={() => onNavigate(page)}
    >
      {label}
    </button>
  );

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <button
          className="nav-brand glitch"
          data-text="VOID.CHAN"
          onClick={() => onNavigate('home')}
        >
          VOID.CHAN
        </button>

        <div className="nav-links">
          {navLink('home',  'BOARD')}
          {navLink('chat',  'CHAT')}

          {user ? (
            <>
              {navLink('contact', 'CONTACT')}
              {user.role === 'admin' && navLink('admin', 'ADMIN')}
              <button className="nav-link" onClick={logout}>
                EXIT
              </button>
            </>
          ) : (
            <>
              {navLink('login',    'LOGIN')}
              {navLink('register', 'REGISTER')}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
