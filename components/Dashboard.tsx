
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskStatus, User } from '../types';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import { generateDailySummary } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  user: User;
  initialData?: { tasks: Task[]; team: string[] };
}

export const formatAppDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(month, 10) - 1;
  return `${day}-${months[mIdx]}-${year}`;
};

const Dashboard: React.FC<DashboardProps> = ({ user, initialData }) => {
  const isAdmin = user.email === 'admin@worksync.ai';
  const [allTasks, setAllTasks] = useState<Task[]>(initialData?.tasks || []);
  const [teamMembers, setTeamMembers] = useState<string[]>(initialData?.team || ['Self']);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(isAdmin ? 'admin' : 'tasks');
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Admin Specific States
  const [serverUsers, setServerUsers] = useState<any[]>([]);
  const [dbBlob, setDbBlob] = useState('');
  const [importText, setImportText] = useState('');

  // Initial Data Pull
  useEffect(() => {
    if (isAdmin) {
      apiService.getAllUsers().then(setServerUsers);
    } else if (!initialData && !user.isGuest) {
      apiService.fetchWorkspace(user.id).then(res => {
        setAllTasks(res.tasks);
        setTeamMembers(res.team);
      });
    }
  }, [user.id, user.isGuest, isAdmin, initialData]);

  // AUTO-SYNC TO SERVER
  const syncToServer = useCallback(async (tasks: Task[], team: string[]) => {
    if (user.isGuest || isAdmin) return;
    setIsSyncing(true);
    try {
      await apiService.syncWorkspace(user.id, tasks, team);
    } catch (e) {
      console.error("Cloud Sync Failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [user.id, user.isGuest, isAdmin]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      syncToServer(allTasks, teamMembers);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [allTasks, teamMembers, syncToServer]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === selectedDate);
  }, [allTasks, selectedDate]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    const targetDate = taskData.dueDate || selectedDate;
    const newTask: Task = { ...taskData, id: crypto.randomUUID(), createdAt: Date.now(), logDate: targetDate };
    setAllTasks(prev => [newTask, ...prev]);
  };

  const handleExportDB = () => {
    const blob = apiService.exportDatabase();
    setDbBlob(blob);
    navigator.clipboard.writeText(blob);
    setFeedback("Server Snapshot copied! Paste this on your other device.");
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleImportDB = () => {
    try {
      apiService.importDatabase(importText);
      setFeedback("Server Mirroring Successful! Refreshing...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setFeedback("Error: Invalid Mirror Blob");
    }
  };

  const statsData = [
    { name: 'To Do', value: filteredTasks.filter(t => t.status === TaskStatus.TODO).length, color: '#6366f1' },
    { name: 'In Progress', value: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
    { name: 'Done', value: filteredTasks.filter(t => t.status === TaskStatus.DONE).length, color: '#10b981' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <i className="fa-solid fa-circle-notch fa-spin"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Server Sync...</span>
        </div>
      )}

      {feedback && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-4">
          <span><i className="fa-solid fa-circle-check mr-2"></i>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto no-scrollbar">
        {isAdmin ? (
          <button className="pb-4 text-sm font-black text-indigo-600 relative flex items-center gap-2">
            <i className="fa-solid fa-server"></i> Server Admin Console
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>
          </button>
        ) : (
          [
            { id: 'tasks', label: 'Work Log', icon: 'fa-clipboard-list' },
            { id: 'team', label: 'Team', icon: 'fa-users' },
            { id: 'overview', label: 'Overview', icon: 'fa-gauge-high' },
            { id: 'stats', label: 'Analytics', icon: 'fa-chart-pie' },
            { id: 'summary', label: 'AI Report', icon: 'fa-wand-magic-sparkles' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
          ))
        )}
      </div>

      <div className="min-h-[400px]">
        {isAdmin ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* User Inspection */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <i className="fa-solid fa-users-gear text-indigo-500"></i> Registered Accounts
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverUsers.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-slate-400 text-sm italic">No users registered on this browser yet.</td></tr>
                    ) : (
                      serverUsers.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-bold text-slate-700">{u.name}</td>
                          <td className="py-4 text-slate-600 text-sm">{u.email}</td>
                          <td className="py-4 font-mono text-xs text-indigo-600 font-bold">{u.password}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Server Mirroring */}
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <i className="fa-solid fa-bridge text-indigo-400"></i> Server Mirroring (Sync Devices)
              </h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                To move all registered users and their tasks to another phone or laptop: 
                <br/>1. On Laptop: Click <strong>"Export Server Blob"</strong>. 
                <br/>2. On Mobile: Paste that code in the <strong>"Restore"</strong> box below.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Step 1: Export</span>
                  <button 
                    onClick={handleExportDB}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"
                  >
                    Copy Global Server Data
                  </button>
                  {dbBlob && (
                    <div className="p-3 bg-white/5 rounded-lg font-mono text-[9px] break-all line-clamp-2 text-indigo-300">
                      {dbBlob}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Step 2: Restore</span>
                  <textarea 
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste Server Blob here..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button 
                    onClick={handleImportDB}
                    disabled={!importText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-20 active:scale-95"
                  >
                    Restore/Sync Server
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <TaskForm onAdd={addTask} teamMembers={teamMembers} />
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><i className="fa-solid fa-chevron-left"></i></button>
                      <span className="font-bold text-slate-700">{formatAppDate(selectedDate)}</span>
                      <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><i className="fa-solid fa-chevron-right"></i></button>
                   </div>
                   <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-xs border border-slate-200 p-2 rounded-lg outline-none"/>
                </div>
                <TaskList tasks={filteredTasks} teamMembers={teamMembers} onUpdateStatus={() => {}} onUpdateResponsible={() => {}} onDelete={() => {}} onMoveTask={() => {}} />
              </div>
            )}

            {activeTab === 'team' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><i className="fa-solid fa-users text-indigo-500"></i> Team Members</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {teamMembers.map(m => (
                    <div key={m} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-700">{m}</div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
               <div className="grid grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
                    <span className="text-slate-500 text-xs uppercase font-black tracking-widest">Tasks Done</span><br/>
                    <span className="text-4xl font-black text-emerald-600">{statsData[2].value}</span>
                 </div>
               </div>
            )}
            
            {activeTab === 'summary' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><i className="fa-solid fa-robot text-indigo-500"></i> AI Generated Report</h2>
                {aiSummary ? <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 border-l-4 border-indigo-100 pl-6 leading-relaxed">{aiSummary}</div> : <div className="text-center py-20 text-slate-400">No report generated for this date.</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
