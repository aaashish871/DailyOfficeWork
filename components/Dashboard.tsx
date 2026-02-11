
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
  const [allTasks, setAllTasks] = useState<Task[]>(initialData?.tasks || []);
  const [teamMembers, setTeamMembers] = useState<string[]>(initialData?.team || ['Self']);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'overview' | 'summary'>('tasks');
  
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
      console.error("Cloud Sync Failed", e);
      setSyncStatus('error');
    }
  }, [user.id, user.isGuest]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      syncToServer(allTasks, teamMembers);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [allTasks, teamMembers, syncToServer]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => t.logDate === selectedDate);
  }, [allTasks, selectedDate]);

  const totalHours = useMemo(() => {
    return filteredTasks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [filteredTasks]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    const targetDate = taskData.dueDate || selectedDate;
    const newTask: Task = { ...taskData, id: generateId(), createdAt: Date.now(), logDate: targetDate };
    setAllTasks(prev => [newTask, ...prev]);
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status, completedAt: status === TaskStatus.DONE ? Date.now() : undefined } : t));
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
    if (window.confirm("Permanently remove this entry?")) {
       setAllTasks(prev => prev.filter(t => t.id !== id));
       if (!user.isGuest) {
         try {
           await apiService.deleteTask(user.id, id);
         } catch (e) {
           alert("Failed to delete from server.");
         }
       }
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

  const handleRenameMember = (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setEditingMember(null);
      return;
    }
    if (teamMembers.includes(newName)) {
      alert("Name already exists.");
      return;
    }
    setTeamMembers(prev => prev.map(m => m === oldName ? newName : m));
    setAllTasks(prev => prev.map(t => t.blocker === oldName ? { ...t, blocker: newName } : t));
    setEditingMember(null);
    setRenameValue('');
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    const summary = await generateDailySummary(filteredTasks);
    setAiSummary(summary);
    setIsGenerating(false);
    setActiveTab('summary');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white hover:shadow-sm rounded-xl text-slate-500 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
            <div className="px-6 text-center">
              <span className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest leading-none mb-1">My Diary</span>
              <span className="text-sm font-black text-slate-800">{formatAppDate(selectedDate)}</span>
            </div>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white hover:shadow-sm rounded-xl text-slate-500 transition-all"><i className="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {totalHours > 0 && (
             <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                <i className="fa-solid fa-fire-flame-curved text-amber-400"></i>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest leading-none text-slate-400">Day Total</span>
                  <span className="text-sm font-black tracking-tight">{totalHours} Logged Hours</span>
                </div>
             </div>
           )}
           
           <div className="min-w-[100px] flex justify-center">
             {syncStatus === 'syncing' && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 animate-pulse">
                  <i className="fa-solid fa-cloud-arrow-up text-[10px]"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Cloud Syncing</span>
               </div>
             )}
             {syncStatus === 'synced' && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                  <i className="fa-solid fa-check text-[10px]"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Safe In Cloud</span>
               </div>
             )}
             {syncStatus === 'error' && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                  <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Cloud Offline</span>
               </div>
             )}
           </div>

           <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-600"/>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-8 gap-10 overflow-x-auto no-scrollbar">
        {[
          { id: 'tasks', label: 'Activity Diary', icon: 'fa-book-open' },
          { id: 'team', label: 'Collaborators', icon: 'fa-users-viewfinder' },
          { id: 'overview', label: 'Summary Stats', icon: 'fa-chart-simple' },
          { id: 'summary', label: 'AI Review', icon: 'fa-wand-magic-sparkles' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_6px_rgba(79,70,229,0.3)]"></div>}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'tasks' && (
          <div className="space-y-10">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} />
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-0.5 flex-1 bg-slate-100"></div>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Timeline</span>
                <div className="h-0.5 flex-1 bg-slate-100"></div>
              </div>
              <TaskList 
                tasks={filteredTasks} 
                teamMembers={teamMembers} 
                onUpdateStatus={updateTaskStatus} 
                onUpdateResponsible={updateTaskResponsible} 
                onUpdateDuration={updateTaskDuration}
                onDelete={deleteTask} 
                onMoveTask={moveTask} 
              />
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-3">
                Collaborators
              </h2>
              <p className="text-slate-400 text-sm mb-10">Who do you work with daily? Add them here to tag them in your logs.</p>
              
              <form onSubmit={addTeamMember} className="flex gap-3 mb-12">
                <input 
                  type="text" 
                  value={newMemberName} 
                  onChange={(e) => setNewMemberName(e.target.value)} 
                  placeholder="Person's name..." 
                  className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
                <button type="submit" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100">Add</button>
              </form>

              <div className="grid grid-cols-1 gap-4">
                {teamMembers.map(m => (
                  <div key={m} className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] group hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm shrink-0">
                        {m.charAt(0).toUpperCase()}
                      </div>
                      
                      {editingMember === m ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameMember(m);
                              if (e.key === 'Escape') setEditingMember(null);
                            }}
                            className="flex-1 bg-white border border-indigo-200 px-4 py-2 rounded-xl text-sm font-bold outline-none shadow-inner"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-black text-slate-700 tracking-tight">{m}</span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Collaborator</span>
                        </div>
                      )}
                    </div>
                    
                    {!editingMember && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingMember(m); setRenameValue(m); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><i className="fa-solid fa-pen-nib"></i></button>
                        {m !== 'Self' && (
                          <button onClick={() => setTeamMembers(prev => prev.filter(x => x !== m))} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><i className="fa-solid fa-trash-can"></i></button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 text-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Diary Entries Today</span>
                <span className="text-4xl font-black text-slate-800 tracking-tighter">{filteredTasks.length}</span>
              </div>
              <div className="bg-indigo-600 p-8 rounded-[2rem] border border-indigo-500 text-center shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                <span className="text-[10px] font-black uppercase text-indigo-200 tracking-widest mb-4 block relative z-10">Total Hours Tracked</span>
                <span className="text-4xl font-black text-white tracking-tighter relative z-10">{totalHours}</span>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-center shadow-xl shadow-slate-200">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4 block">Productivity Score</span>
                <span className="text-4xl font-black text-white tracking-tighter">{Math.min(100, (totalHours / 8) * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center transition-all hover:border-indigo-100">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-4 tracking-tight">Need to send a report?</h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">Our AI will analyze your daily diary entries and draft a perfect, professional summary for your boss or team stand-up.</p>
                  <button 
                    onClick={handleGenerateSummary}
                    disabled={isGenerating || filteredTasks.length === 0}
                    className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] px-10 py-5 rounded-2xl hover:bg-indigo-600 transition-all disabled:opacity-20 shadow-xl shadow-slate-100 flex items-center justify-center gap-3"
                  >
                    {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-bolt"></i> Generate Professional Review</>}
                  </button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200 max-w-3xl mx-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <i className="fa-solid fa-robot text-indigo-600"></i> AI Intelligence Review
              </h2>
              <button onClick={() => { navigator.clipboard.writeText(aiSummary); alert("Copied to clipboard!"); }} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">
                <i className="fa-solid fa-copy mr-2"></i> Copy Text
              </button>
            </div>
            {aiSummary ? (
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-600 border-l-4 border-indigo-100 pl-8 leading-relaxed font-medium text-sm md:text-base">
                {aiSummary}
              </div>
            ) : (
              <div className="text-center py-20">
                <i className="fa-solid fa-brain text-slate-100 text-6xl mb-4"></i>
                <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No review generated yet.</p>
                <button onClick={() => setActiveTab('overview')} className="mt-4 text-indigo-600 font-bold text-xs">Go to Summary Stats</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
