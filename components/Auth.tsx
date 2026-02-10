
import React, { useState } from 'react';
import { User, Task } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const avatarColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    const users = JSON.parse(localStorage.getItem('ws_users') || '[]');
    
    if (isLogin) {
      const foundUser = users.find((u: any) => u.email === email && u.password === password);
      if (foundUser) {
        onLogin({
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          isGuest: false,
          avatarColor: foundUser.avatarColor
        });
      } else {
        setError('Invalid credentials. If you created this account on another device, use the "Import Workspace" option below.');
      }
    } else {
      if (users.find((u: any) => u.email === email)) {
        setError('User already exists with this email.');
        return;
      }

      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password,
        avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)]
      };

      users.push(newUser);
      localStorage.setItem('ws_users', JSON.stringify(users));
      
      onLogin({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isGuest: false,
        avatarColor: newUser.avatarColor
      });
    }
  };

  const handleImportWorkspace = () => {
    try {
      const decoded = JSON.parse(atob(importCode));
      if (!decoded.user || !decoded.tasks || !decoded.team) throw new Error();

      // Save user to this device's user list
      const users = JSON.parse(localStorage.getItem('ws_users') || '[]');
      if (!users.find((u: any) => u.id === decoded.user.id)) {
        users.push({ ...decoded.user, password: 'imported_user' }); // Password isn't exported for safety, but session is created
        localStorage.setItem('ws_users', JSON.stringify(users));
      }

      // Save user's specific data
      localStorage.setItem(`work_sync_tasks_${decoded.user.id}`, JSON.stringify(decoded.tasks));
      localStorage.setItem(`work_sync_team_${decoded.user.id}`, JSON.stringify(decoded.team));

      onLogin(decoded.user);
    } catch (e) {
      setError('Invalid sync code. Please make sure you copied the full code from your other device.');
    }
  };

  const handleGuestLogin = () => {
    onLogin({
      id: 'guest',
      name: 'Guest User',
      email: 'guest@worksync.ai',
      isGuest: true,
      avatarColor: '#94a3b8'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-all">
        <div className="p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mb-4">
              <i className="fa-solid fa-circle-check text-3xl"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">WorkSync AI</h1>
            <p className="text-slate-500 font-medium text-sm">Transfer data between devices easily</p>
          </div>

          {!showImport ? (
            <>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
                <button 
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setShowPassword(false); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Login
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setShowPassword(false); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-in fade-in slide-in-from-top-2">
                    <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="w-full bg-slate-100 text-slate-600 font-bold text-xs py-3 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-file-import"></i>
                  Import Existing Workspace
                </button>
                <button 
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full bg-white border border-slate-200 text-slate-500 font-bold text-xs py-3 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-user-secret"></i>
                  Continue as Guest
                </button>
              </div>
            </>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Import Workspace</h2>
              <p className="text-slate-500 text-xs mb-6">Paste the sync code generated from your other device to instantly restore your tasks and team.</p>
              
              <textarea 
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Paste your code here..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-6"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowImport(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleImportWorkspace}
                  disabled={!importCode.trim()}
                  className="flex-[2] bg-indigo-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  Restore Workspace
                </button>
              </div>
            </div>
          )}
          
          <p className="text-center text-[10px] text-slate-400 mt-6 uppercase tracking-tighter font-medium">
            Your data is stored locally for maximum privacy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
