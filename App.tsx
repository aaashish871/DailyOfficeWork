
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { User } from './types';
import { apiService } from './services/apiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<{ tasks: any[]; team: string[] } | undefined>();

  useEffect(() => {
    // Check for existing real session from SQL Server
    const checkAuth = async () => {
      try {
        const currentUser = await apiService.getCurrentUser();
        if (currentUser) {
          const workspace = await apiService.fetchWorkspace(currentUser.id);
          setUser(currentUser);
          setInitialData(workspace);
        }
      } catch (e) {
        console.error('Session error', e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (newUser: User, data?: { tasks: any[]; team: string[] }) => {
    setUser(newUser);
    setInitialData(data);
  };

  const handleLogout = async () => {
    await apiService.signOut();
    setUser(null);
    setInitialData(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-indigo-500 text-4xl mb-4"></i>
          <p className="text-white text-[10px] font-black uppercase tracking-widest">Connecting to Central Server...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
              <i className="fa-solid fa-server"></i>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">WorkSync <span className="text-indigo-600">Pro</span></span>
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">SQL Server Live</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-sm font-bold text-slate-800">{user.name}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user.email}</span>
            </div>
            
            <div className="relative group">
              <button 
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white border border-slate-200 shadow-sm transition-all overflow-hidden font-black"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left p-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
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
        <Dashboard user={user} initialData={initialData} />
      </main>
    </div>
  );
};

export default App;
