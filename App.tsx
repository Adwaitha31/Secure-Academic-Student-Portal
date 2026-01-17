
import React, { useState } from 'react';
import { User, UserRole, AppState } from './types';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import MFA from './components/Auth/MFA';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import FacultyDashboard from './components/Dashboard/FacultyDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';

const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'mfa' | 'dashboard'>('login');
  const [state, setState] = useState<AppState>({
    currentUser: null,
    mfaPending: null,
    assignments: [],
    logs: [],
  });

  const handleLoginSuccess = (user: User) => {
    if (user.mfaEnabled) {
      setState(prev => ({ ...prev, mfaPending: user }));
      setView('mfa');
    } else {
      setState(prev => ({ ...prev, currentUser: user }));
      setView('dashboard');
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null, mfaPending: null }));
    setView('login');
  };

  const renderView = () => {
    switch (view) {
      case 'login':
        return <Login onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setView('register')} />;
      case 'register':
        return <Register onRegisterSuccess={() => setView('login')} onGoToLogin={() => setView('login')} />;
      case 'mfa':
        return <MFA 
          onVerified={() => {
            if (state.mfaPending) {
              setState(prev => ({ ...prev, currentUser: prev.mfaPending, mfaPending: null }));
              setView('dashboard');
            }
          }} 
          onCancel={() => setView('login')} 
        />;
      case 'dashboard':
        if (!state.currentUser) {
          setView('login');
          return null;
        }
        return (
          <div className="min-h-screen flex flex-col">
            <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-xl border-b border-white/10 sticky top-0 z-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">A</div>
                <div>
                  <h1 className="font-bold text-lg leading-tight">AcademicPortal</h1>
                  <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Secured Environment</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{state.currentUser.role}</span>
                  <span className="font-medium text-slate-200">{state.currentUser.username}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20"
                >
                  Terminate Session
                </button>
              </div>
            </nav>
            <main className="flex-1 container mx-auto p-4 sm:p-8">
              {state.currentUser.role === UserRole.STUDENT && <StudentDashboard user={state.currentUser} />}
              {state.currentUser.role === UserRole.FACULTY && <FacultyDashboard user={state.currentUser} />}
              {state.currentUser.role === UserRole.ADMIN && <AdminDashboard user={state.currentUser} />}
            </main>
          </div>
        );
      default:
        return <Login onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setView('register')} />;
    }
  };

  return <div className="min-h-screen bg-slate-50 antialiased">{renderView()}</div>;
};

export default App;
