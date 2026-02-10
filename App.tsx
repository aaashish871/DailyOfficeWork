
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('ws_active_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Session error', e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('ws_active_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ws_active_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <i className="fa-solid fa-circle-notch fa-spin text-indigo-600 text-4xl"></i>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-600">
            <i className="fa-solid fa-circle-check text-xl"></i>
            <span className="hidden sm:inline">WorkSync AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-sm font-bold text-slate-800">{user.name}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {user.isGuest ? 'Guest Access' : 'Verified Member'}
              </span>
            </div>
            
            <div className="relative group">
              <button 
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white border border-slate-200 shadow-sm transition-all overflow-hidden"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                <div className="p-3 border-b border-slate-50 mb-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left p-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="animate-in fade-in duration-700">
        <Dashboard user={user} />
      </main>
    </div>
  );
};

export default App;
