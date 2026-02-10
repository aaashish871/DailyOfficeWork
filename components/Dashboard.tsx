
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, User } from '../types';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import { generateDailySummary } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  user: User;
}

/**
 * Utility to convert YYYY-MM-DD to DD-MMM-YYYY (e.g., 10-Feb-2026)
 */
export const formatAppDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(month, 10) - 1;
  return `${day}-${months[mIdx]}-${year}`;
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>(['Self', 'Rahul', 'Priya', 'Amit']);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'summary' | 'stats' | 'team' | 'sync'>('tasks');
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Modal States
  const [deletionError, setDeletionError] = useState<{name: string, tasks: Task[]} | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [syncCode, setSyncCode] = useState('');

  // User-specific storage keys
  const TASKS_KEY = `work_sync_tasks_${user.id}`;
  const TEAM_KEY = `work_sync_team_${user.id}`;

  useEffect(() => {
    const savedTasks = localStorage.getItem(TASKS_KEY);
    const savedTeam = localStorage.getItem(TEAM_KEY);
    
    if (savedTasks) {
      try { setAllTasks(JSON.parse(savedTasks)); } catch (e) { setAllTasks([]); }
    } else { setAllTasks([]); }

    if (savedTeam) {
      try { 
        const parsedTeam = JSON.parse(savedTeam);
        setTeamMembers(Array.isArray(parsedTeam) && parsedTeam.length > 0 ? parsedTeam : ['Self']);
      } catch (e) { setTeamMembers(['Self']); }
    } else { setTeamMembers(['Self', 'Rahul', 'Priya', 'Amit']); }
    
    setAiSummary('');
  }, [user.id, TASKS_KEY, TEAM_KEY]);

  useEffect(() => {
    if (user) localStorage.setItem(TASKS_KEY, JSON.stringify(allTasks));
  }, [allTasks, TASKS_KEY, user]);

  useEffect(() => {
    if (user) localStorage.setItem(TEAM_KEY, JSON.stringify(teamMembers));
  }, [teamMembers, TEAM_KEY, user]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === selectedDate);
  }, [allTasks, selectedDate]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    const targetDate = taskData.dueDate || selectedDate;
    const newTask: Task = { ...taskData, id: crypto.randomUUID(), createdAt: Date.now(), logDate: targetDate };
    setAllTasks(prev => [newTask, ...prev]);
    if (targetDate !== selectedDate) {
      setFeedback(`Task logged for ${formatAppDate(targetDate)}`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status, completedAt: status === TaskStatus.DONE ? Date.now() : undefined } : t));
  };

  const updateTaskResponsible = (id: string, responsible: string) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, blocker: responsible } : t));
  };

  const moveTask = (id: string, newDate: string, reason: string) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, logDate: newDate, postponedReason: reason } : t));
    setFeedback(`Task moved to ${formatAppDate(newDate)}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const deleteTask = (id: string) => {
    if (window.confirm("Delete this task?")) setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (name && !teamMembers.includes(name)) {
      setTeamMembers(prev => [...prev, name]);
      setNewMemberName('');
      setFeedback(`New member "${name}" added.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const generateSyncCode = () => {
    const data = { user, tasks: allTasks, team: teamMembers };
    const code = btoa(JSON.stringify(data));
    setSyncCode(code);
  };

  const copySyncCode = () => {
    navigator.clipboard.writeText(syncCode);
    setFeedback("Sync Code copied to clipboard!");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    const summary = await generateDailySummary(filteredTasks);
    setAiSummary(summary);
    setIsGenerating(false);
    setActiveTab('summary');
  };

  const statsData = [
    { name: 'To Do', value: filteredTasks.filter(t => t.status === TaskStatus.TODO).length, color: '#6366f1' },
    { name: 'In Progress', value: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
    { name: 'Done', value: filteredTasks.filter(t => t.status === TaskStatus.DONE).length, color: '#10b981' },
  ];

  const blockedTasksCount = filteredTasks.filter(t => !!t.blocker && t.blocker !== 'Self').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 1. Deletion BLOCKED Modal */}
      {deletionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-user-lock text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Deletion Blocked</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                You cannot remove <span className="font-bold text-indigo-600">"{deletionError.name}"</span> because they still have active tasks.
              </p>
              <button onClick={() => setDeletionError(null)} className="w-full bg-slate-800 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-lg active:scale-[0.98]">Okay</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Deletion CONFIRMATION Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-100">
                <i className="fa-solid fa-trash-can text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Confirm Removal</h3>
              <p className="text-slate-500 text-sm mb-8">Are you sure you want to remove <span className="font-bold text-slate-900">"{confirmDelete}"</span>?</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setTeamMembers(prev => prev.filter(m => m !== confirmDelete)); setConfirmDelete(null); }} className="w-full bg-red-500 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-red-600 transition-all shadow-lg">Yes, Remove</button>
                <button onClick={() => setConfirmDelete(null)} className="w-full bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs py-3 rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><i className="fa-solid fa-chevron-left"></i></button>
          <div className="flex flex-col items-center px-4 min-w-[180px]">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Journal Date</span>
            <span className="text-lg font-bold text-slate-800 tracking-tight">{formatAppDate(selectedDate)}</span>
          </div>
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">Today</button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
        </div>
      </div>

      {feedback && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300">
          <span><i className="fa-solid fa-circle-check mr-2"></i>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'tasks', label: 'Work Log', icon: 'fa-clipboard-list' },
          { id: 'team', label: 'Team', icon: 'fa-users' },
          { id: 'overview', label: 'Overview', icon: 'fa-gauge-high' },
          { id: 'stats', label: 'Analytics', icon: 'fa-chart-pie' },
          { id: 'summary', label: 'AI Report', icon: 'fa-wand-magic-sparkles' },
          { id: 'sync', label: 'Sync', icon: 'fa-cloud-arrow-up' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'tasks' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} />
            <TaskList tasks={filteredTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onDelete={deleteTask} onMoveTask={moveTask} />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><i className="fa-solid fa-users text-indigo-500"></i>Team Management</h2>
            <form onSubmit={addTeamMember} className="flex gap-2 mb-8">
              <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Enter member name..." className="flex-1 px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg">Add Member</button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teamMembers.map(member => (
                <div key={member} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 transition-all hover:border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{member.charAt(0)}</div>
                    <span className="font-medium text-slate-700">{member}</span>
                  </div>
                  <button onClick={() => { if (allTasks.some(t => t.blocker === member && t.status !== TaskStatus.DONE)) { setDeletionError({ name: member, tasks: [] }); } else { setConfirmDelete(member); } }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><i className="fa-solid fa-trash-can text-sm"></i></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center"><span className="text-slate-500 text-sm">To Do</span><br/><span className="text-4xl font-black">{statsData[0].value}</span></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-blue-600"><span className="text-slate-500 text-sm">In Progress</span><br/><span className="text-4xl font-black">{statsData[1].value}</span></div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-emerald-600"><span className="text-slate-500 text-sm">Completed</span><br/><span className="text-4xl font-black">{statsData[2].value}</span></div>
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2"><i className="fa-solid fa-cloud-arrow-up text-indigo-500"></i>Sync Workspace</h2>
            <p className="text-slate-500 text-sm mb-8">To move your work logs and team members to your mobile or another computer, generate a sync code and paste it on the login screen of your other device.</p>
            
            {!syncCode ? (
              <button 
                onClick={generateSyncCode}
                className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
              >
                Generate Sync Code
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                   <div className="text-[10px] font-mono break-all line-clamp-4 text-slate-400 mb-2">{syncCode}</div>
                   <button 
                    onClick={copySyncCode}
                    className="w-full bg-emerald-500 text-white font-black uppercase tracking-widest text-xs py-3 rounded-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                   >
                    <i className="fa-solid fa-copy"></i> Copy Code to Clipboard
                   </button>
                </div>
                <button 
                  onClick={() => setSyncCode('')}
                  className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                >
                  Clear Code
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><i className="fa-solid fa-robot text-indigo-500"></i> AI Generated Report</h2>
            {aiSummary ? <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 border-l-4 border-indigo-100 pl-6 leading-relaxed">{aiSummary}</div> : <div className="text-center py-20 text-slate-400">No report generated yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
