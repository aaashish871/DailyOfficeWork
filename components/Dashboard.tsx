
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

const Dashboard: React.FC<DashboardProps> = ({ user, initialData }) => {
  const [allTasks, setAllTasks] = useState<Task[]>(initialData?.tasks || []);
  const [teamMembers, setTeamMembers] = useState<string[]>(initialData?.team || ['Self']);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'overview' | 'stats' | 'summary'>('tasks');
  
  // States for renaming
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Initial Data Pull (Silent)
  useEffect(() => {
    if (!initialData && !user.isGuest) {
      apiService.fetchWorkspace(user.id).then(res => {
        setAllTasks(res.tasks);
        setTeamMembers(res.team);
      });
    }
  }, [user.id, user.isGuest, initialData]);

  // AUTO-SYNC TO CENTRAL SERVER
  const syncToServer = useCallback(async (tasks: Task[], team: string[]) => {
    if (user.isGuest) return;
    setIsSyncing(true);
    try {
      await apiService.syncWorkspace(user.id, tasks, team);
    } catch (e) {
      console.error("Cloud Sync Failed", e);
    } finally {
      setIsSyncing(false);
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

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => {
    const targetDate = taskData.dueDate || selectedDate;
    const newTask: Task = { ...taskData, id: crypto.randomUUID(), createdAt: Date.now(), logDate: targetDate };
    setAllTasks(prev => [newTask, ...prev]);
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status, completedAt: status === TaskStatus.DONE ? Date.now() : undefined } : t));
  };

  const updateTaskResponsible = (id: string, responsible: string) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, blocker: responsible } : t));
  };

  const moveTask = (id: string, newDate: string, reason: string) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, logDate: newDate, postponedReason: reason } : t));
  };

  const deleteTask = (id: string) => {
    if (window.confirm("Remove this entry?")) setAllTasks(prev => prev.filter(t => t.id !== id));
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
      alert("A team member with this name already exists.");
      return;
    }

    // Update Team List
    setTeamMembers(prev => prev.map(m => m === oldName ? newName : m));
    
    // Update all tasks assigned to this person (Cascade Update)
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

  const statsData = [
    { name: 'To Do', value: filteredTasks.filter(t => t.status === TaskStatus.TODO).length, color: '#6366f1' },
    { name: 'In Progress', value: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
    { name: 'Done', value: filteredTasks.filter(t => t.status === TaskStatus.DONE).length, color: '#10b981' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Date Navigation & Sync State */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><i className="fa-solid fa-chevron-left"></i></button>
          <div className="text-center min-w-[150px]">
            <span className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest">Journaling For</span>
            <span className="text-lg font-bold text-slate-800">{formatAppDate(selectedDate)}</span>
          </div>
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
        
        <div className="flex items-center gap-4">
           {isSyncing && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 animate-pulse">
                <i className="fa-solid fa-cloud-arrow-up text-[10px]"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">Saving...</span>
             </div>
           )}
           <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm border border-slate-200 p-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 gap-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'tasks', label: 'Work Log', icon: 'fa-clipboard-list' },
          { id: 'team', label: 'My Team', icon: 'fa-users' },
          { id: 'overview', label: 'Overview', icon: 'fa-gauge' },
          { id: 'summary', label: 'AI Summary', icon: 'fa-wand-magic-sparkles' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      <div className="min-h-[500px] animate-in fade-in duration-500">
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <TaskForm onAdd={addTask} teamMembers={teamMembers} />
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
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-3">
                <i className="fa-solid fa-users text-indigo-600"></i> Team Members
              </h2>
              <p className="text-slate-400 text-sm mb-8">Manage users you can assign tasks or blockers to. Renaming a member updates all their assigned tasks.</p>
              
              <form onSubmit={addTeamMember} className="flex gap-2 mb-10">
                <input 
                  type="text" 
                  value={newMemberName} 
                  onChange={(e) => setNewMemberName(e.target.value)} 
                  placeholder="Collaborator name..." 
                  className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">Add</button>
              </form>

              <div className="grid grid-cols-1 gap-4">
                {teamMembers.map(m => (
                  <div key={m} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm shrink-0">
                        {m.charAt(0).toUpperCase()}
                      </div>
                      
                      {editingMember === m ? (
                        <div className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                          <input 
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameMember(m);
                              if (e.key === 'Escape') setEditingMember(null);
                            }}
                            className="flex-1 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => handleRenameMember(m)}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button 
                            onClick={() => setEditingMember(null)}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-700 truncate">{m}</span>
                      )}
                    </div>
                    
                    {!editingMember && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingMember(m); setRenameValue(m); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Rename member"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        {m !== 'Self' && (
                          <button 
                            onClick={() => {
                              if(window.confirm(`Delete ${m}? Tasks assigned to them will stay but they'll be marked as 'Former'.`)) {
                                setTeamMembers(prev => prev.filter(x => x !== m));
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete member"
                          >
                            <i className="fa-solid fa-trash-can text-sm"></i>
                          </button>
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pending</span><br/>
                <span className="text-5xl font-black text-slate-800">{statsData[0].value + statsData[1].value}</span>
              </div>
              <div className="bg-indigo-600 p-8 rounded-3xl border border-indigo-500 text-center shadow-xl shadow-indigo-100">
                <span className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">Completed</span><br/>
                <span className="text-5xl font-black text-white">{statsData[2].value}</span>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm flex flex-col items-center justify-center gap-2">
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isGenerating || filteredTasks.length === 0}
                  className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-20"
                >
                  {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Summarize Day with AI'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
            <h2 className="text-2xl font-black mb-8 text-slate-800 flex items-center gap-3">
              <i className="fa-solid fa-robot text-indigo-600"></i> AI Intelligence Report
            </h2>
            {aiSummary ? (
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-600 border-l-4 border-indigo-100 pl-8 leading-relaxed font-medium">
                {aiSummary}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-300">
                <i className="fa-solid fa-wand-magic-sparkles text-4xl mb-4 block"></i>
                <p className="font-bold">No summary generated for this date.</p>
                <p className="text-xs">Go to Overview and click 'Summarize Day' to use AI.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
