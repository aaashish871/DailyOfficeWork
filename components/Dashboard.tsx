
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
  
  // States for tab navigation
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

  // Filtering Logic
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
      {/* Dynamic Context Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
            {activeTab === 'diary' && (
              <>
                <button onClick={() => { const d = new Date(diaryDate); d.setDate(d.getDate()-1); setDiaryDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="px-5 text-center min-w-[140px]">
                  <span className="block text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-0.5">Work Diary</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(diaryDate)}</span>
                </div>
                <button onClick={() => { const d = new Date(diaryDate); d.setDate(d.getDate()+1); setDiaryDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-right"></i></button>
              </>
            )}
            {activeTab === 'planner' && (
              <div className="px-6 py-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <i className="fa-solid fa-bolt text-amber-600"></i>
                </div>
                <div className="text-left">
                  <span className="block text-[9px] font-black uppercase text-amber-600 tracking-widest mb-0.5">Today's Agenda</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(todayStr)}</span>
                </div>
              </div>
            )}
            {activeTab === 'future' && (
              <>
                <button onClick={() => { const d = new Date(futureDate); d.setDate(d.getDate()-1); setFutureDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="px-5 text-center min-w-[140px]">
                  <span className="block text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-0.5">Future Roadmap</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(futureDate)}</span>
                </div>
                <button onClick={() => { const d = new Date(futureDate); d.setDate(d.getDate()+1); setFutureDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400 transition-all"><i className="fa-solid fa-chevron-right"></i></button>
              </>
            )}
            {(activeTab === 'team' || activeTab === 'overview' || activeTab === 'summary') && (
              <div className="px-10 py-2">
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Insights & Admin</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {activeTab === 'diary' && totalHoursLogged > 0 && (
             <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-100">
               <i className="fa-solid fa-fire text-amber-400"></i>
               <span className="text-[10px] font-black uppercase tracking-widest">{totalHoursLogged}h Logged Today</span>
             </div>
           )}
           <div className="min-w-[40px] flex justify-center">
             {syncStatus === 'syncing' && <i className="fa-solid fa-cloud-arrow-up text-indigo-400 animate-bounce"></i>}
             {syncStatus === 'synced' && <i className="fa-solid fa-check-circle text-emerald-400" title="Saved to cloud"></i>}
           </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 mb-10 gap-10 overflow-x-auto no-scrollbar">
        {[
          { id: 'diary', label: 'Work Diary', icon: 'fa-book-bookmark' },
          { id: 'planner', label: 'Today\'s Plan', icon: 'fa-lightning-bolt' },
          { id: 'future', label: 'Future Tasks', icon: 'fa-calendar-plus' },
          { id: 'team', label: 'Collaborators', icon: 'fa-users-gear' },
          { id: 'overview', label: 'Stats', icon: 'fa-chart-simple' },
          { id: 'summary', label: 'AI Review', icon: 'fa-wand-magic-sparkles' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-3 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon.replace('fa-lightning-bolt', 'fa-bolt')} text-xs`}></i>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'diary' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} defaultStatus={TaskStatus.DONE} />
            <div className="relative">
               <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Daily Records</h3>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <TaskList tasks={diaryTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} defaultStatus={TaskStatus.TODO} />
            <div className="relative">
               <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500">Today's Commitment</h3>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <TaskList tasks={todayPlannedTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
            </div>
          </div>
        )}

        {activeTab === 'future' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Prominent Date Picker for Future Planning */}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-100 border border-indigo-400/30">
               <div>
                  <h2 className="text-2xl font-black mb-1 flex items-center gap-3">
                    <i className="fa-solid fa-map-location-dot"></i> Planning Horizon
                  </h2>
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Pick any date to schedule meetings or roadmap items.</p>
               </div>
               <div className="flex items-center gap-4 bg-white/10 p-4 rounded-3xl border border-white/20 backdrop-blur-sm">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-1">Target Date</span>
                    <input 
                      type="date" 
                      value={futureDate} 
                      onChange={(e) => setFutureDate(e.target.value)} 
                      className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black outline-none border-none shadow-xl focus:ring-4 focus:ring-white/30 transition-all"
                    />
                  </div>
               </div>
            </div>

            <TaskForm onAdd={addTask} teamMembers={teamMembers} defaultStatus={TaskStatus.TODO} />
            
            <div className="relative">
               <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Roadmap for {formatAppDate(futureDate)}</h3>
                 <div className="h-px flex-1 bg-slate-100"></div>
               </div>
               <TaskList tasks={futurePlannedTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={updateTaskResponsible} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 animate-in fade-in duration-500">
             <div className="max-w-xl mx-auto">
               <h2 className="text-2xl font-black text-slate-800 mb-2">Team Directory</h2>
               <p className="text-slate-400 text-xs mb-10 uppercase tracking-[0.3em] font-black">Manage members for task collaboration.</p>
               <form onSubmit={addTeamMember} className="flex gap-4 mb-12">
                 <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Member full name..." className="flex-1 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"/>
                 <button type="submit" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all hover:bg-indigo-600 shadow-xl shadow-slate-100 active:scale-95">Add Member</button>
               </form>
               <div className="grid gap-5">
                 {teamMembers.map(m => (
                   <div key={m} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:border-indigo-100 group">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.2rem] flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100">{m.charAt(0).toUpperCase()}</div>
                       <span className="font-black text-slate-700 text-lg">{m}</span>
                     </div>
                     {m !== 'Self' && <button onClick={() => setTeamMembers(prev => prev.filter(x => x !== m))} className="w-12 h-12 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"><i className="fa-solid fa-trash-can"></i></button>}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
             <div className="bg-white p-12 rounded-[3rem] border border-slate-200 text-center shadow-sm">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-check-double text-xl"></i>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">Completed Logs</span>
                <span className="text-6xl font-black text-slate-800 tracking-tighter">{allTasks.filter(t => t.status === TaskStatus.DONE).length}</span>
             </div>
             <div className="bg-indigo-600 p-12 rounded-[3rem] text-center shadow-2xl shadow-indigo-100 border border-indigo-500">
                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-hourglass-start text-xl"></i>
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-200 tracking-widest block mb-4">Active Commitments</span>
                <span className="text-6xl font-black text-white tracking-tighter">{allTasks.filter(t => t.status !== TaskStatus.DONE).length}</span>
             </div>
             <div className="bg-slate-900 p-12 rounded-[3rem] text-center shadow-sm">
                <div className="w-14 h-14 bg-slate-800 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-stopwatch text-xl"></i>
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-4">Total Efforts</span>
                <span className="text-6xl font-black text-white tracking-tighter">{totalHoursLogged}h</span>
             </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 max-w-3xl mx-auto animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-12">
               <h2 className="text-2xl font-black text-slate-800 flex items-center gap-5">
                 <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                 AI Sync Report
               </h2>
               <button 
                 onClick={handleGenerateSummary} 
                 disabled={isGenerating || diaryTasks.length === 0} 
                 className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-30 shadow-xl shadow-slate-100 active:scale-95 flex items-center gap-3"
               >
                 {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-bolt"></i> Generate</>}
               </button>
             </div>
             {aiSummary ? (
               <div className="prose prose-slate max-w-none text-slate-600 border-l-8 border-indigo-100 pl-10 leading-loose font-medium whitespace-pre-wrap text-base animate-in slide-in-from-left-4">
                 {aiSummary}
               </div>
             ) : (
               <div className="text-center py-24 text-slate-300 font-black uppercase text-xs tracking-[0.4em]">
                 <i className="fa-solid fa-brain-circuit text-7xl mb-10 opacity-10"></i><br/>
                 Waiting for input logs
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
