
import React, { useState, useEffect } from 'react';
import { TaskStatus, TaskPriority, Task } from '../types';

interface TaskFormProps {
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => void;
  teamMembers: string[];
  defaultStatus?: TaskStatus;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAdd, teamMembers, defaultStatus = TaskStatus.DONE }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [category, setCategory] = useState('Development');
  const [blocker, setBlocker] = useState('Self');
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (!teamMembers.includes(blocker)) {
      setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
    }
  }, [teamMembers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title,
      description,
      status: defaultStatus,
      priority,
      category,
      blocker: blocker || undefined,
      duration: duration ? parseFloat(duration) : undefined,
    });

    setTitle('');
    setDescription('');
    setPriority(TaskPriority.MEDIUM);
    setDuration('');
    setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
  };

  const isPlanner = defaultStatus !== TaskStatus.DONE;

  const categories = [
    'Meeting',
    'Development',
    'Bug Fix',
    'Testing',
    'Documentation',
    'Research',
    'Planning',
    'Support',
    'Admin',
    'Brainstorming',
    'Other'
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 transition-all hover:border-indigo-100 group">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black flex items-center gap-3 text-slate-800">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPlanner ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'bg-emerald-50 text-emerald-600 shadow-sm'}`}>
            <i className={`fa-solid ${isPlanner ? 'fa-calendar-day' : 'fa-award'}`}></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs">{isPlanner ? 'Plan a Goal' : 'Record Achievement'}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isPlanner ? 'Future Schedule' : 'Diary Entry'}</span>
          </div>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Title / Activity</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isPlanner ? "Meeting with Manager, Feature dev..." : "Finished API docs, Fixed bug #10..."}
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold text-slate-700"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Estimated Hours</label>
          <div className="relative">
            <i className="fa-solid fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="number"
              step="any"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-700"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Priority Level</label>
          <select 
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-600 appearance-none"
          >
            <option value={TaskPriority.LOW}>Low Priority</option>
            <option value={TaskPriority.MEDIUM}>Medium Priority</option>
            <option value={TaskPriority.HIGH}>High Priority</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-600 appearance-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Collaborator</label>
          <select
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-600 appearance-none"
          >
            {teamMembers.map(member => (
              <option key={member} value={member}>{member === 'Self' ? 'Myself' : member}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1"></div>

        <div className="md:col-span-2 space-y-2 flex items-end">
          <button type="submit" className={`w-full ${isPlanner ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95`}>
            {isPlanner ? <i className="fa-solid fa-calendar-plus"></i> : <i className="fa-solid fa-check-circle"></i>}
            {isPlanner ? 'Schedule Future Task' : 'Log Achievement'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TaskForm;
