
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';

interface AuthProps {
  onLogin: (user: User, initialData?: { tasks: any[]; team: string[] }) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Handle errors or success messages coming back from email redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      
      // If there is an error (like expired link or localhost failure)
      if (hash.includes('error_description')) {
        const errorMsg = params.get('error_description')?.replace(/\+/g, ' ');
        if (errorMsg) {
          setError(`Note: ${errorMsg}. If you already clicked the link in your email, your account is likely verified. Please try signing in below.`);
        }
      } 
      // If confirmation was successful but redirect failed back to app
      else if (hash.includes('type=signup') || hash.includes('access_token')) {
        setError('Email verified successfully! You can now Sign In.');
      }
      
      // Clean the URL hash to keep things tidy
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const avatarColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await apiService.login(email, password);
        onLogin(data.user, { tasks: data.tasks, team: data.team });
      } else {
        if (!name.trim()) throw new Error('Full Name is required');
        const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
        await apiService.register(name, email, password, color);
        setVerificationSent(true);
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication error.';
      if (msg.includes('Email not confirmed')) {
        msg = 'Please verify your email first. Check your inbox (and spam folder) for the confirmation link.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-envelope-circle-check text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Check Your Inbox</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Verification link sent to:<br/>
            <strong className="text-indigo-600">{email}</strong><br/><br/>
            Click the link in the email to activate your account.
            <br/><br/>
            <div className="text-[10px] text-amber-700 font-bold bg-amber-50 p-4 rounded-xl border border-amber-100 text-left">
              <i className="fa-solid fa-circle-info mr-2"></i>
              IMPORTANT: After clicking "Confirm your mail", if you see a "Site can't be reached" error, it means your email is verified but the redirect failed. 
              <br/><br/>
              Just close that tab and click "Back to Sign In" below to start using the app.
            </div>
          </p>
          <button 
            onClick={() => setVerificationSent(false)}
            className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        <div className="p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl mb-4 shadow-xl">
              <i className="fa-solid fa-shield-halved text-3xl"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">WorkSync <span className="text-indigo-600">SQL</span></h1>
            <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Enterprise SQL Central Server</p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className={`p-4 text-xs font-bold rounded-xl border flex items-start gap-3 ${error.includes('successfully') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                <i className={`fa-solid mt-0.5 ${error.includes('successfully') ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                <span>{error}</span>
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
                    placeholder="e.g. Ashish"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Work Email</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  required
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
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center active:scale-[0.98]"
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isLogin ? 'Sign In to Server' : 'Register & Verify')}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Secured Enterprise Access<br/>
            Syncs automatically across all devices
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
