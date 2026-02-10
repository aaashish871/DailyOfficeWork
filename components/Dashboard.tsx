
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import { generateDailySummary } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

const Dashboard: React.FC = () => {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>(['Self', 'Rahul', 'Priya', 'Amit']);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'summary' | 'stats' | 'team'>('tasks');
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Modal States
  const [deletionError, setDeletionError] = useState<{name: string, tasks: Task[]} | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    const savedTasks = localStorage.getItem('work_sync_tasks_v2');
    const savedTeam = localStorage.getItem('work_sync_team');
    
    if (savedTasks) {
      try { setAllTasks(JSON.parse(savedTasks)); } catch (e) { console.error(e); }
    }
    if (savedTeam) {
      try { 
        const parsedTeam = JSON.parse(savedTeam);
        if (Array.isArray(parsedTeam) && parsedTeam.length > 0) {
          setTeamMembers(parsedTeam);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  // Sync to local storage on changes
  useEffect(() => {
    localStorage.setItem('work_sync_tasks_v2', JSON.stringify(allTasks));
  }, [allTasks]);

  useEffect(() => {
    localStorage.setItem('work_sync_team', JSON.stringify(teamMembers));
  }, [teamMembers]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === selectedDate);
  }, [allTasks, selectedDate]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    const targetDate = taskData.dueDate || selectedDate;
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      logDate: targetDate, 
    };
    
    setAllTasks(prev => [newTask, ...prev]);
    
    if (targetDate !== selectedDate) {
      setFeedback(`Task logged for ${formatAppDate(targetDate)}`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status, completedAt: status === TaskStatus.DONE ? Date.now() : undefined } : t
    ));
  };

  const updateTaskResponsible = (id: string, responsible: string) => {
    setAllTasks(prev => prev.map(t => 
      t.id === id ? { ...t, blocker: responsible } : t
    ));
  };

  const moveTask = (id: string, newDate: string, reason: string) => {
    setAllTasks(prev => prev.map(t => 
      t.id === id ? { ...t, logDate: newDate, postponedReason: reason } : t
    ));
    setFeedback(`Task moved to ${formatAppDate(newDate)}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const deleteTask = (id: string) => {
    if (window.confirm("Delete this task?")) {
      setAllTasks(prev => prev.filter(t => t.id !== id));
    }
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

  const initiateRemoveMember = (name: string) => {
    // 1. Check for active tasks across ALL logs
    const activeTasks = allTasks.filter(task => 
      task.blocker === name && 
      (task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS)
    );

    // 2. If active tasks found, show reason modal and STOP
    if (activeTasks.length > 0) {
      setDeletionError({ name, tasks: activeTasks });
      return;
    }

    // 3. Otherwise, show custom confirmation modal
    setConfirmDelete(name);
  };

  const executeRemoveMember = () => {
    if (!confirmDelete) return;
    
    const nameToRemove = confirmDelete;
    setTeamMembers(prev => prev.filter(m => m !== nameToRemove));
    
    setConfirmDelete(null);
    setFeedback(`Member "${nameToRemove}" has been removed from the team.`);
    setTimeout(() => setFeedback(null), 4000);
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
      {/* 1. Deletion BLOCKED Modal (Strict protection) */}
      {deletionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-user-lock text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Deletion Blocked</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                You cannot remove <span className="font-bold text-indigo-600">"{deletionError.name}"</span> because they still have <span className="font-bold text-slate-800">{deletionError.tasks.length}</span> active task(s) in progress.
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 mb-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 text-center border-b border-slate-200 pb-2">Unfinished Work</span>
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar mt-3">
                  {deletionError.tasks.map(t => (
                    <li key={t.id} className="text-xs text-slate-600 flex items-start gap-2">
                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === TaskStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-indigo-500'}`}></div>
                      <div>
                        <span className="font-medium line-clamp-1">{t.title}</span>
                        <span className="text-[9px] text-slate-400 font-bold">Status: {t.status} • {formatAppDate(t.logDate)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[10px] text-slate-500 font-medium leading-tight bg-white p-2 rounded-lg border border-slate-200 shadow-sm italic">
                   Help: All tasks must be marked as 'DONE' or re-assigned before a member can be removed.
                </p>
              </div>

              <button 
                onClick={() => setDeletionError(null)}
                className="w-full bg-slate-800 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-lg active:scale-[0.98]"
              >
                I'll check those tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Deletion CONFIRMATION Modal (User decision) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-100">
                <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Remove Member?</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-900">"{confirmDelete}"</span>? 
                <br/>Their past completed logs will remain visible, but they won't appear in new task assignments.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={executeRemoveMember}
                  className="w-full bg-red-500 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-100 active:scale-[0.97]"
                >
                  Yes, Remove Them
                </button>
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="w-full bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs py-3 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Keep Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]);
          }} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><i className="fa-solid fa-chevron-left"></i></button>
          <div className="flex flex-col items-center px-4 min-w-[180px]">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Journal Date</span>
            <span className="text-lg font-bold text-slate-800 tracking-tight">{formatAppDate(selectedDate)}</span>
          </div>
          <button onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]);
          }} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">Today</button>
          <div className="relative">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
          </div>
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
          { id: 'summary', label: 'AI Report', icon: 'fa-wand-magic-sparkles' }
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-700">Detailed Work Log</h2>
              <span className="text-xs font-bold text-slate-400 uppercase">{filteredTasks.length} Entries Found</span>
            </div>
            <TaskList 
              tasks={filteredTasks} 
              teamMembers={teamMembers}
              onUpdateStatus={updateTaskStatus} 
              onUpdateResponsible={updateTaskResponsible}
              onDelete={deleteTask} 
              onMoveTask={moveTask} 
            />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2"><i className="fa-solid fa-users text-indigo-500"></i>Team Management</h2>
            <form onSubmit={addTeamMember} className="flex gap-2 mb-8">
              <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Enter member name..." className="flex-1 px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors active:scale-95 shadow-lg shadow-indigo-100">Add Member</button>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teamMembers.map(member => (
                <div key={member} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 transition-all hover:border-indigo-200 hover:shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{member.charAt(0)}</div>
                    <span className="font-medium text-slate-700">{member}</span>
                  </div>
                  <button 
                    onClick={() => initiateRemoveMember(member)} 
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100" 
                    title="Remove member"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-8 italic text-center uppercase tracking-widest font-bold">Only members with no active tasks can be removed</p>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-list-check text-xl"></i>
                </div>
                <span className="text-slate-500 font-medium text-sm">To Do</span>
                <span className="text-4xl font-black text-slate-800 mt-1">{statsData[0].value}</span>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Planned Tasks</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-spinner text-xl animate-spin-slow"></i>
                </div>
                <span className="text-slate-500 font-medium text-sm">In Progress</span>
                <span className="text-4xl font-black text-blue-600 mt-1">{statsData[1].value}</span>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Currently Active</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-circle-check text-xl"></i>
                </div>
                <span className="text-slate-500 font-medium text-sm">Completed</span>
                <span className="text-4xl font-black text-emerald-600 mt-1">{statsData[2].value}</span>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Finished Today</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-2">Blocker Alert</h3>
                  <p className="text-slate-400 text-sm mb-6">You have {blockedTasksCount} task{blockedTasksCount !== 1 ? 's' : ''} currently waiting for response or action from team members.</p>
                  <button onClick={() => setActiveTab('tasks')} className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors">View Blockers</button>
                </div>
                <i className="fa-solid fa-triangle-exclamation absolute -right-4 -bottom-4 text-8xl text-white/5 transform rotate-12"></i>
              </div>

              <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-2">Smart Reporting</h3>
                  <p className="text-indigo-100 text-sm mb-6">Generate a professional office report based on your tasks logged for {formatAppDate(selectedDate)}.</p>
                  <button onClick={handleGenerateSummary} disabled={filteredTasks.length === 0} className="bg-indigo-400/30 backdrop-blur-sm border border-indigo-300/30 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-400/50 transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    Summarize Day
                  </button>
                </div>
                <i className="fa-solid fa-robot absolute -right-4 -bottom-4 text-8xl text-white/5 transform -rotate-12"></i>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-[500px] animate-in fade-in duration-300">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-indigo-500"></i>Task Distribution Analytics</h2>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                    {statsData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><i className="fa-solid fa-robot text-indigo-500"></i> AI Generated Report</h2>
              <button onClick={handleGenerateSummary} disabled={isGenerating || filteredTasks.length === 0} className="text-indigo-600 text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                <i className={`fa-solid fa-rotate ${isGenerating ? 'fa-spin' : ''}`}></i> {isGenerating ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
            {aiSummary ? (
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 border-l-4 border-indigo-100 pl-6 leading-relaxed">{aiSummary}</div>
            ) : (
              <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <i className="fa-solid fa-sparkles text-3xl mb-4 opacity-30"></i>
                <p className="font-medium">No report generated for this date yet.</p>
                <p className="text-xs mt-1">Log some tasks and click 'Summarize Day' to begin.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 
        .animate-spin-slow { animation: spin 3s linear infinite; } 
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default Dashboard;
