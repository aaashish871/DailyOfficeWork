
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskStatus, User } from '../types';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import { generateDailySummary } from '../services/geminiService';
import { apiService } from '../services/apiService';

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

const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const Dashboard: React.FC<DashboardProps> = ({ user, initialData }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [allTasks, setAllTasks] = useState<Task[]>(initialData?.tasks || []);
  const [teamMembers, setTeamMembers] = useState<string[]>(initialData?.team || ['Self']);
  const [newMemberName, setNewMemberName] = useState('');
  
  // States for different tab views
  const [diaryDate, setDiaryDate] = useState<string>(todayStr);
  const [futureDate, setFutureDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'diary' | 'planner' | 'future' | 'team' | 'overview' | 'summary'>('diary');
  
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!initialData && !user.isGuest) {
      apiService.fetchWorkspace(user.id).then(res => {
        setAllTasks(res.tasks);
        setTeamMembers(res.team);
      });
    }
  }, [user.id, user.isGuest, initialData]);

  const syncToServer = useCallback(async (tasks: Task[], team: string[]) => {
    if (user.isGuest) return;
    setSyncStatus('syncing');
    try {
      await apiService.syncWorkspace(user.id, tasks, team);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus(prev => prev === 'synced' ? 'idle' : prev), 3000);
    } catch (e) {
      setSyncStatus('error');
    }
  }, [user.id, user.isGuest]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      syncToServer(allTasks, teamMembers);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [allTasks, teamMembers, syncToServer]);

  // Logic for different tabs
  const diaryTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === diaryDate && t.status === TaskStatus.DONE);
  }, [allTasks, diaryDate]);

  const todayPlannedTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === todayStr && t.status !== TaskStatus.DONE);
  }, [allTasks, todayStr]);

  const futurePlannedTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === futureDate && t.status !== TaskStatus.DONE);
  }, [allTasks, futureDate]);

  const totalHoursLogged = useMemo(() => {
    return diaryTasks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [diaryTasks]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    let targetDate = todayStr;
    if (activeTab === 'diary') targetDate = diaryDate;
    if (activeTab === 'future') targetDate = futureDate;
    
    const newTask: Task = { ...taskData, id: generateId(), createdAt: Date.now(), logDate: targetDate };
    setAllTasks(prev => [newTask, ...prev]);
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isNowDone = status === TaskStatus.DONE;
        return { 
          ...t, 
          status, 
          // If task is finished today, log it for today
          logDate: isNowDone ? todayStr : t.logDate,
          completedAt: isNowDone ? Date.now() : undefined 
        };
      }
      return t;
    }));
  };

  const updateTaskResponsible = (id: string, responsible: string) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, blocker: responsible } : t));
  };

  const updateTaskDuration = (id: string, duration: number) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, duration } : t));
  };

  const moveTask = (id: string, newDate: string, reason: string) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, logDate: newDate, postponedReason: reason } : t));
  };

  const deleteTask = async (id: string) => {
    if (window.confirm("Delete this entry?")) {
       setAllTasks(prev => prev.filter(t => t.id !== id));
       if (!user.isGuest) apiService.deleteTask(user.id, id).catch(() => {});
    }
  };

  const addTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (name && !teamMembers.includes(name)) {
      setTeamMembers(prev => [...prev, name]);
      setNewMemberName('');
    }
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    const summary = await generateDailySummary(diaryTasks);
    setAiSummary(summary);
    setIsGenerating(false);
    setActiveTab('summary');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Dynamic Tab Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100">
            {activeTab === 'diary' && (
              <>
                <button onClick={() => { const d = new Date(diaryDate); d.setDate(d.getDate()-1); setDiaryDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="px-5 text-center min-w-[140px]">
                  <span className="block text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-0.5">Work Diary</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(diaryDate)}</span>
                </div>
                <button onClick={() => { const d = new Date(diaryDate); d.setDate(d.getDate()+1); setDiaryDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-right"></i></button>
              </>
            )}
            {activeTab === 'planner' && (
              <div className="px-6 py-2 flex items-center gap-3">
                <i className="fa-solid fa-bolt-lightning text-amber-500"></i>
                <div className="text-left">
                  <span className="block text-[9px] font-black uppercase text-amber-600 tracking-widest mb-0.5">Today's Goals</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(todayStr)}</span>
                </div>
              </div>
            )}
            {activeTab === 'future' && (
              <>
                <button onClick={() => { const d = new Date(futureDate); d.setDate(d.getDate()-1); setFutureDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="px-5 text-center min-w-[140px]">
                  <span className="block text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-0.5">Roadmap View</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(futureDate)}</span>
                </div>
                <button onClick={() => { const d = new Date(futureDate); d.setDate(d.getDate()+1); setFutureDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-right"></i></button>
              </>
            )}
            {(activeTab === 'team' || activeTab === 'overview' || activeTab === 'summary') && (
              <div className="px-10 py-2">
                 <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Management View</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {activeTab === 'diary' && totalHoursLogged > 0 && (
             <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-xl">
               <span className="text-xs font-black">{totalHoursLogged}h Done</span>
             </div>
           )}
           {activeTab === 'planner' && todayPlannedTasks.length > 0 && (
             <div className="flex items-center gap-3 px-4 py-2 bg-amber-500 text-white rounded-xl">
               <span className="text-xs font-black">{todayPlannedTasks.length} Pending</span>
             </div>
           )}
           <div className="flex items-center gap-2">
              {activeTab === 'diary' && <input type="date" value={diaryDate} onChange={(e) => setDiaryDate(e.target.value)} className="text-[10px] border border-slate-200 p-2 rounded-lg font-black text-slate-500"/>}
              {activeTab === 'future' && <input type="date" value={futureDate} onChange={(e) => setFutureDate(e.target.value)} className="text-[10px] border border-slate-200 p-2 rounded-lg font-black text-slate-500"/>}
           </div>
           {syncStatus === 'syncing' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-10 gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'diary', label: 'Work Diary', icon: 'fa-book-open' },
          { id: 'planner', label: 'Today\'s Plan', icon: 'fa-bolt-lightning' },
          { id: 'future', label: 'Future Tasks', icon: 'fa-calendar-days' },
          { id: 'team', label: 'Team', icon: 'fa-users' },
          { id: 'overview', label: 'Stats', icon: 'fa-chart-line' },
          { id: 'summary', label: 'AI Review', icon: 'fa-wand-magic-sparkles' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative flex items-center gap-2.5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`}></i>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'diary' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} defaultStatus={TaskStatus.DONE} />
            <div className="relative">
               <div className="flex items-center gap-4 mb-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Daily Log</h3>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <TaskList tasks={diaryTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} defaultStatus={TaskStatus.TODO} />
            <div className="relative">
               <div className="flex items-center gap-4 mb-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Today's Agenda</h3>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <TaskList tasks={todayPlannedTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
            </div>
          </div>
        )}

        {activeTab === 'future' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} defaultStatus={TaskStatus.TODO} />
            <div className="relative">
               <div className="flex items-center gap-4 mb-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Upcoming Schedule</h3>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <TaskList tasks={futurePlannedTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 animate-in fade-in">
             <div className="max-w-xl mx-auto">
               <h2 className="text-xl font-black text-slate-800 mb-8">Work Collaborators</h2>
               <form onSubmit={addTeamMember} className="flex gap-4 mb-10">
                 <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Member name..." className="flex-1 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"/>
                 <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100 transition-all hover:bg-indigo-600">Add</button>
               </form>
               <div className="grid gap-3">
                 {teamMembers.map(m => (
                   <div key={m} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:border-indigo-100">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm">{m.charAt(0).toUpperCase()}</div>
                       <span className="font-bold text-slate-700">{m}</span>
                     </div>
                     {m !== 'Self' && <button onClick={() => setTeamMembers(prev => prev.filter(x => x !== m))} className="p-2 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">Total Finished Tasks</span>
                <span className="text-5xl font-black text-slate-800">{allTasks.filter(t => t.status === TaskStatus.DONE).length}</span>
             </div>
             <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-center shadow-xl shadow-indigo-100">
                <span className="text-[10px] font-black uppercase text-indigo-200 tracking-widest block mb-4">Pending in Planner</span>
                <span className="text-5xl font-black text-white">{allTasks.filter(t => t.status !== TaskStatus.DONE).length}</span>
             </div>
             <div className="bg-slate-900 p-10 rounded-[2.5rem] text-center">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-4">Hours Logged Today</span>
                <span className="text-5xl font-black text-white">{totalHoursLogged}h</span>
             </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 max-w-3xl mx-auto animate-in fade-in">
             <div className="flex items-center justify-between mb-10">
               <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><i className="fa-solid fa-sparkles text-indigo-600"></i> Smart Review</h2>
               <button onClick={handleGenerateSummary} disabled={isGenerating || diaryTasks.length === 0} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-30">
                 {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Generate Report'}
               </button>
             </div>
             {aiSummary ? (
               <div className="prose prose-slate max-w-none text-slate-600 border-l-4 border-indigo-100 pl-8 leading-relaxed font-medium">{aiSummary}</div>
             ) : (
               <div className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-widest">No review generated for {formatAppDate(diaryDate)}</div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
