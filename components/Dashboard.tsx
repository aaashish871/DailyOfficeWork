
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskStatus, User, ImportantPoint } from '../types';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import { generateDailySummary } from '../services/geminiService';
import { apiService } from '../services/apiService';

interface DashboardProps {
  user: User;
  initialData?: { tasks: Task[]; team: string[]; categories: string[]; points?: ImportantPoint[] };
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
  const [categories, setCategories] = useState<string[]>(initialData?.categories || ['Meeting', 'Development', 'Bug Fix', 'Testing', 'Planning']);
  const [importantPoints, setImportantPoints] = useState<ImportantPoint[]>(initialData?.points || []);
  
  const [newMemberName, setNewMemberName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPointContent, setNewPointContent] = useState('');
  
  // States for renaming categories
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [diaryDate, setDiaryDate] = useState<string>(todayStr);
  const [futureDate, setFutureDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'diary' | 'planner' | 'future' | 'team' | 'overview' | 'summary' | 'points'>('diary');

  useEffect(() => {
    if (!initialData && !user.isGuest) {
      apiService.fetchWorkspace(user.id).then(res => {
        setAllTasks(res.tasks);
        setTeamMembers(res.team);
        setCategories(res.categories);
        setImportantPoints(res.points || []);
      });
    }
  }, [user.id, user.isGuest, initialData]);

  const syncToServer = useCallback(async (tasks: Task[], team: string[], cats: string[], points: ImportantPoint[]) => {
    if (user.isGuest) return;
    setSyncStatus('syncing');
    try {
      await apiService.syncWorkspace(user.id, tasks, team, cats, points);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus(prev => prev === 'synced' ? 'idle' : prev), 3000);
    } catch (e) {
      setSyncStatus('error');
    }
  }, [user.id, user.isGuest]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      syncToServer(allTasks, teamMembers, categories, importantPoints);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [allTasks, teamMembers, categories, importantPoints, syncToServer]);

  const diaryTasks = useMemo(() => allTasks.filter(t => t.logDate === diaryDate && t.status === TaskStatus.DONE), [allTasks, diaryDate]);
  const todayPlannedTasks = useMemo(() => allTasks.filter(t => t.logDate === todayStr && t.status !== TaskStatus.DONE), [allTasks, todayStr]);
  const futurePlannedTasks = useMemo(() => allTasks.filter(t => t.logDate === futureDate && t.status !== TaskStatus.DONE), [allTasks, futureDate]);
  const totalHoursLogged = useMemo(() => diaryTasks.reduce((acc, t) => acc + (t.duration || 0), 0), [diaryTasks]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    let targetDate = todayStr;
    if (activeTab === 'diary') targetDate = diaryDate;
    if (activeTab === 'future') targetDate = futureDate;
    const newTask: Task = { ...taskData, id: generateId(), createdAt: Date.now(), logDate: targetDate };
    setAllTasks(prev => [newTask, ...prev]);
  };

  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isNowDone = status === TaskStatus.DONE;
        return { ...t, status, logDate: isNowDone ? todayStr : t.logDate, completedAt: isNowDone ? Date.now() : undefined };
      }
      return t;
    }));
  }, [todayStr]);

  const deleteTask = useCallback((id: string) => {
    setAllTasks(prev => prev.filter(t => t.id !== id));
    if (!user.isGuest) {
      apiService.deleteTask(user.id, id).catch(err => console.error("Failed to delete task:", err));
    }
  }, [user.id, user.isGuest]);

  const moveTask = useCallback((id: string, newDate: string, reason: string) => {
    setAllTasks(prev => prev.map(t => 
      t.id === id ? { ...t, logDate: newDate, postponedReason: reason } : t
    ));
  }, []);

  const updateTaskDuration = useCallback((id: string, duration: number) => {
    setAllTasks(prev => prev.map(t => 
      t.id === id ? { ...t, duration } : t
    ));
  }, []);

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (name && !categories.includes(name)) {
      setCategories(prev => [...prev, name]);
      setNewCategoryName('');
    }
  };

  const deleteCategory = (name: string) => {
    if (categories.length <= 1) {
      alert("At least one category is required.");
      return;
    }
    setCategories(prev => prev.filter(c => c !== name));
  };

  const handleRenameCategory = (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenamingCategory(null);
      return;
    }
    if (categories.includes(newName)) {
      alert("This category name already exists.");
      return;
    }
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    setAllTasks(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    setRenamingCategory(null);
  };

  const addPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPointContent.trim()) return;
    const newPoint: ImportantPoint = {
      id: generateId(),
      content: newPointContent.trim(),
      createdAt: Date.now()
    };
    setImportantPoints(prev => [newPoint, ...prev]);
    setNewPointContent('');
  };

  const deletePoint = (id: string) => {
    setImportantPoints(prev => prev.filter(p => p.id !== id));
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

  const goToWorkspace = () => setActiveTab('team');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Context */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
            {activeTab === 'diary' && (
              <>
                <button onClick={() => { const d = new Date(diaryDate); d.setDate(d.getDate()-1); setDiaryDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="px-5 text-center min-w-[140px]">
                  <span className="block text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-0.5">Work Diary</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(diaryDate)}</span>
                </div>
                <button onClick={() => { const d = new Date(diaryDate); d.setDate(d.getDate()+1); setDiaryDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400"><i className="fa-solid fa-chevron-right"></i></button>
              </>
            )}
            {activeTab === 'planner' && (
              <div className="px-6 py-2 flex items-center gap-3">
                <i className="fa-solid fa-bolt text-amber-500"></i>
                <span className="text-sm font-black text-slate-800">Today's Goals: {formatAppDate(todayStr)}</span>
              </div>
            )}
            {activeTab === 'future' && (
              <>
                <button onClick={() => { const d = new Date(futureDate); d.setDate(d.getDate()-1); setFutureDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="px-5 text-center min-w-[140px]">
                  <span className="block text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-0.5">Roadmap View</span>
                  <span className="text-sm font-black text-slate-800">{formatAppDate(futureDate)}</span>
                </div>
                <button onClick={() => { const d = new Date(futureDate); d.setDate(d.getDate()+1); setFutureDate(d.toISOString().split('T')[0]); }} className="p-3 hover:bg-white rounded-xl text-slate-400"><i className="fa-solid fa-chevron-right"></i></button>
              </>
            )}
            {['team', 'overview', 'summary', 'points'].includes(activeTab) && (
              <div className="px-10 py-2">
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Workspace Central</span>
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
             {syncStatus === 'synced' && <i className="fa-solid fa-check-circle text-emerald-400"></i>}
           </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 mb-10 gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'diary', label: 'Work Diary', icon: 'fa-book-bookmark' },
          { id: 'planner', label: 'Today\'s Plan', icon: 'fa-bolt' },
          { id: 'future', label: 'Future Tasks', icon: 'fa-calendar-plus' },
          { id: 'points', label: 'Knowledge', icon: 'fa-lightbulb' },
          { id: 'team', label: 'Workspace', icon: 'fa-users-gear' },
          { id: 'overview', label: 'Stats', icon: 'fa-chart-simple' },
          { id: 'summary', label: 'AI Review', icon: 'fa-wand-magic-sparkles' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap relative flex items-center gap-3 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`}></i>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'diary' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            <TaskForm onAdd={addTask} onManageCategories={goToWorkspace} teamMembers={teamMembers} categories={categories} defaultStatus={TaskStatus.DONE} />
            <TaskList tasks={diaryTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={()=>{}} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            <TaskForm onAdd={addTask} onManageCategories={goToWorkspace} teamMembers={teamMembers} categories={categories} defaultStatus={TaskStatus.TODO} />
            <TaskList tasks={todayPlannedTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={()=>{}} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
          </div>
        )}

        {activeTab === 'future' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-100">
               <div>
                  <h2 className="text-2xl font-black mb-1">Planning Horizon</h2>
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Pick any date to schedule meetings or roadmap items.</p>
               </div>
               <input type="date" value={futureDate} onChange={(e) => setFutureDate(e.target.value)} className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black outline-none border-none shadow-xl" />
            </div>
            <TaskForm onAdd={addTask} onManageCategories={goToWorkspace} teamMembers={teamMembers} categories={categories} defaultStatus={TaskStatus.TODO} />
            <TaskList tasks={futurePlannedTasks} teamMembers={teamMembers} onUpdateStatus={updateTaskStatus} onUpdateResponsible={()=>{}} onUpdateDuration={updateTaskDuration} onDelete={deleteTask} onMoveTask={moveTask} />
          </div>
        )}

        {activeTab === 'points' && (
          <div className="animate-in fade-in space-y-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3">
                <i className="fa-solid fa-lightbulb text-amber-400"></i> Knowledge Base
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 ml-9">Record important points, shortcuts, or links here for quick reference.</p>
              
              <form onSubmit={addPoint} className="flex gap-4 mb-10">
                <input 
                  type="text" 
                  value={newPointContent} 
                  onChange={(e) => setNewPointContent(e.target.value)} 
                  placeholder="Type an important point (e.g. Server IP: 192.168.1.1)..." 
                  className="flex-1 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-amber-400 transition-all" 
                />
                <button type="submit" className="bg-amber-400 text-slate-900 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-amber-100 active:scale-95 transition-all">Add Point</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {importantPoints.length === 0 ? (
                  <div className="md:col-span-3 py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <i className="fa-solid fa-note-sticky text-4xl text-slate-100 mb-4"></i>
                    <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">No saved insights yet</p>
                  </div>
                ) : (
                  importantPoints.map(p => (
                    <div key={p.id} className="bg-amber-50/30 border border-amber-100/50 p-6 rounded-[2rem] relative group hover:shadow-xl hover:shadow-amber-50/50 transition-all hover:-translate-y-1">
                      <button onClick={() => deletePoint(p.id)} className="absolute top-4 right-4 text-amber-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fa-solid fa-circle-xmark"></i>
                      </button>
                      <p className="text-slate-800 font-bold leading-relaxed pr-6">{p.content}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase text-amber-300 tracking-widest">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                        <button onClick={() => { navigator.clipboard.writeText(p.content); }} className="text-[8px] font-black uppercase text-amber-400 hover:text-amber-600 tracking-widest flex items-center gap-1.5 transition-colors">
                          <i className="fa-solid fa-copy"></i> Copy
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3">
                 <i className="fa-solid fa-tags text-indigo-600"></i> Category Management
               </h2>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 ml-9">Renaming a category will update all existing task tags automatically.</p>
               
               <form onSubmit={addCategory} className="flex gap-4 mb-8">
                 <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name (e.g. Research)..." className="flex-1 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                 <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Add Category</button>
               </form>
               
               <div className="flex flex-wrap gap-4">
                 {categories.map(c => (
                   <div key={c} className="flex items-center gap-3 px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-700 group transition-all hover:bg-white hover:shadow-md hover:border-indigo-100">
                     {renamingCategory === c ? (
                       <div className="flex items-center gap-2">
                          <input 
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameCategory(c)}
                            onKeyDown={(e) => { 
                              if(e.key === 'Enter') handleRenameCategory(c); 
                              if(e.key === 'Escape') setRenamingCategory(null); 
                            }}
                            className="bg-white border border-indigo-200 px-3 py-1.5 rounded-xl text-sm outline-none w-32 font-black shadow-inner"
                          />
                          <button onClick={() => handleRenameCategory(c)} className="text-emerald-500 hover:text-emerald-600"><i className="fa-solid fa-circle-check"></i></button>
                       </div>
                     ) : (
                       <>
                         <span className="text-sm font-black">{c}</span>
                         <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setRenamingCategory(c); setRenameValue(c); }} className="w-8 h-8 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center"><i className="fa-solid fa-pen-to-square text-xs"></i></button>
                           <button onClick={() => deleteCategory(c)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"><i className="fa-solid fa-trash-can text-xs"></i></button>
                         </div>
                       </>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                 <i className="fa-solid fa-user-group text-emerald-600"></i> Team Directory
               </h2>
               <form onSubmit={addTeamMember} className="flex gap-4 mb-8">
                 <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Collaborator name..." className="flex-1 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                 <button type="submit" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">Add Member</button>
               </form>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {teamMembers.map(m => (
                   <div key={m} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                     <span className="font-black text-slate-700">{m}</span>
                     {m !== 'Self' && <button onClick={() => setTeamMembers(prev => prev.filter(x => x !== m))} className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"><i className="fa-solid fa-trash-can"></i></button>}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
             <div className="bg-white p-12 rounded-[3rem] border border-slate-200 text-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">Completed Logs</span>
                <span className="text-6xl font-black text-slate-800 tracking-tighter">{allTasks.filter(t => t.status === TaskStatus.DONE).length}</span>
             </div>
             <div className="bg-indigo-600 p-12 rounded-[3rem] text-center shadow-2xl shadow-indigo-100 border border-indigo-500">
                <span className="text-[10px] font-black uppercase text-indigo-200 tracking-widest block mb-4">Open Commitments</span>
                <span className="text-6xl font-black text-white tracking-tighter">{allTasks.filter(t => t.status !== TaskStatus.DONE).length}</span>
             </div>
             <div className="bg-slate-900 p-12 rounded-[3rem] text-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-4">Logged Hours</span>
                <span className="text-6xl font-black text-white tracking-tighter">{totalHoursLogged}h</span>
             </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 max-w-3xl mx-auto animate-in fade-in">
             <div className="flex items-center justify-between mb-12">
               <h2 className="text-2xl font-black text-slate-800 flex items-center gap-5">
                 <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                 AI Review
               </h2>
               <button onClick={handleGenerateSummary} disabled={isGenerating || diaryTasks.length === 0} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-30 flex items-center gap-3">
                 {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-bolt"></i> Generate</>}
               </button>
             </div>
             {aiSummary ? (
               <div className="prose prose-slate max-w-none text-slate-600 border-l-8 border-indigo-100 pl-10 whitespace-pre-wrap">{aiSummary}</div>
             ) : (
               <div className="text-center py-24 text-slate-300 font-black uppercase text-xs tracking-[0.4em]">Waiting for activity logs</div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
