
import React, { useState } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
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

    // For demo purposes, we simulate auth using localStorage
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
        setError('Invalid credentials. Try guest login or create a new account.');
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
            <p className="text-slate-500 font-medium">Your Daily Productivity Partner</p>
          </div>

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
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

          <div className="mt-8 pt-8 border-t border-slate-100">
            <button 
              type="button"
              onClick={handleGuestLogin}
              className="w-full bg-white border border-slate-200 text-slate-600 font-bold text-sm py-3 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-user-secret"></i>
              Continue as Guest
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-tighter font-medium">
              Guests can log tasks but data is local to this browser
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
