/**
 * src/App.jsx
 *
 * Root application component with simple client-side routing.
 *
 * WHY manual routing instead of React Router:
 *  - For a 4-page app, a useState-based router is 0 extra dependencies
 *  - React Router adds value at ~10+ routes or when nested layouts are complex
 *  - Easy to swap to React Router later — just replace the switch
 */

import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { useState } from 'react';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('home');

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user && (page === 'login' || page === 'register')) {
      setPage('dashboard');
    }
  }, [user, loading, page]);

  // Guard protected pages
  useEffect(() => {
    if (!loading && !user && page === 'dashboard') {
      setPage('login');
    }
  }, [user, loading, page]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <>
      <Navbar onNavigate={setPage} />
      <main style={{ flex: 1 }}>
        {page === 'home'      && <HomePage      onNavigate={setPage} />}
        {page === 'login'     && <LoginPage     onNavigate={setPage} />}
        {page === 'register'  && <RegisterPage  onNavigate={setPage} />}
        {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
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
