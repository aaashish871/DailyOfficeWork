
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

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 transition-all hover:border-indigo-100 group">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black flex items-center gap-3 text-slate-800">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isPlanner ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <i className={`fa-solid ${isPlanner ? 'fa-calendar-plus' : 'fa-check-double'}`}></i>
          </div>
          {isPlanner ? 'Set a Future Goal' : 'Record an Achievement'}
        </h2>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
             {isPlanner ? 'Plan Mode' : 'Log Mode'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isPlanner ? "What needs to be done?" : "What did you accomplish?"}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold text-slate-700"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Time (Hrs)</label>
          <div className="relative">
            <i className="fa-solid fa-stopwatch absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="number"
              step="any"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="0.0"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-700"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-600 appearance-none"
          >
            <option>Development</option>
            <option>Meeting</option>
            <option>Documentation</option>
            <option>Testing</option>
            <option>Admin</option>
          </select>
        </div>

        <div className="md:col-span-1 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">With / Blocker</label>
          <select
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-600 appearance-none"
          >
            {teamMembers.map(member => (
              <option key={member} value={member}>{member === 'Self' ? 'Myself' : member}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3"></div>

        <div className="space-y-2 flex items-end">
          <button type="submit" className={`w-full ${isPlanner ? 'bg-indigo-600' : 'bg-slate-900'} text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95`}>
            {isPlanner ? <i className="fa-solid fa-plus-circle"></i> : <i className="fa-solid fa-check-circle"></i>}
            {isPlanner ? 'Add to Schedule' : 'Log to Diary'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TaskForm;
