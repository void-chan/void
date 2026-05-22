/**
 * src/App.jsx — Root application with state-based router
 */
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar }         from './components/layout/Navbar';
import { HomePage }       from './pages/HomePage';
import { BlogPostPage }   from './pages/BlogPostPage';
import { ChatPage }       from './pages/ChatPage';
import { LoginPage }      from './pages/LoginPage';
import { RegisterPage }   from './pages/RegisterPage';
import { ContactPage }    from './pages/ContactPage';
import { AdminPage }      from './pages/AdminPage';
import { RecoverPage }    from './pages/RecoverPage';

function AppContent() {
  const { user, loading } = useAuth();
  // page: string, params: object
  const [nav, setNav] = useState({ page: 'home', params: {} });

  function navigate(page, params = {}) {
    setNav({ page, params });
  }

  // Auth guards
  useEffect(() => {
    if (loading) return;
    if (!user && (nav.page === 'contact' || nav.page === 'admin')) {
      navigate('login');
    }
    if (user && nav.page === 'admin' && user.role !== 'admin') {
      navigate('home');
    }
  }, [user, loading, nav.page]);

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',flexDirection:'column',gap:'0.75rem'}}>
        <div className="spinner" style={{width:'2rem',height:'2rem'}} />
        <div style={{fontSize:'var(--text-xs)',color:'var(--green-muted)',textTransform:'uppercase',letterSpacing:'0.15em'}}>
          Initializing...
        </div>
      </div>
    );
  }

  const { page, params } = nav;

  return (
    <>
      <Navbar onNavigate={navigate} currentPage={page} />
      <main style={{flex:1,display:'flex',flexDirection:'column'}}>
        {page === 'home'     && <HomePage     onNavigate={navigate} />}
        {page === 'post'     && <BlogPostPage slug={params.slug} onNavigate={navigate} />}
        {page === 'chat'     && <ChatPage />}
        {page === 'login'    && <LoginPage    onNavigate={navigate} />}
        {page === 'register' && <RegisterPage onNavigate={navigate} />}
        {page === 'contact'  && <ContactPage />}
        {page === 'recover'  && <RecoverPage  onNavigate={navigate} />}
        {page === 'admin'    && <AdminPage />}
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
