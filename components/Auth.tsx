
import React, { useState } from 'react';
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
  
  // Verification States
  const [verificationPending, setVerificationPending] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const avatarColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { user, tasks, team } = await apiService.login(email, password);
        onLogin(user, { tasks, team });
      } else {
        if (!name.trim()) throw new Error('Please enter your full name');
        const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
        await apiService.register(name, email, password, color);
        
        // Show verification screen instead of logging in
        setVerifiedEmail(email);
        setVerificationPending(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const simulateVerification = async () => {
    setLoading(true);
    try {
      await apiService.verifyEmail(verifiedEmail);
      setIsLogin(true);
      setVerificationPending(false);
      setError('Email verified! You can now sign in.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verificationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-indigo-100">
            <i className="fa-solid fa-paper-plane text-3xl animate-bounce"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Verify Your Email</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            We've triggered a verification email to:<br/>
            <strong className="text-indigo-600 font-bold">{verifiedEmail}</strong>
          </p>
          
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left mb-8">
            <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1 flex items-center gap-2">
              <i className="fa-solid fa-flask"></i> Simulation Mode
            </h4>
            <p className="text-xs text-amber-700 leading-tight">
              In a real company server, you would check your inbox now. For this demo, click below to simulate clicking the verification link.
            </p>
          </div>

          <button 
            onClick={simulateVerification}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Simulate Verification Link Click'}
          </button>
          
          <button 
            onClick={() => setVerificationPending(false)}
            className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 underline underline-offset-4"
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
              <i className="fa-solid fa-cloud-check text-3xl"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">WorkSync <span className="text-indigo-600">Pro</span></h1>
            <p className="text-slate-400 font-medium text-xs uppercase tracking-widest mt-1">Central Enterprise Registry</p>
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
              <div className={`p-4 text-xs font-bold rounded-xl animate-in fade-in slide-in-from-top-2 flex items-center gap-3 ${error.includes('verified!') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                <i className={`fa-solid ${error.includes('verified!') ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                {error}
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
                    placeholder="Enter your name"
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
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Security Password</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin text-xl"></i> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              Secured by Company Firewall
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
