
import React from 'react';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-600">
            <i className="fa-solid fa-circle-check text-xl"></i>
            <span>WorkSync AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
              <i className="fa-solid fa-user text-xs"></i>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Dashboard />
      </main>
    </div>
  );
};

export default App;
