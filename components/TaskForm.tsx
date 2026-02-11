
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
  const [dueDate, setDueDate] = useState('');
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
      dueDate: dueDate || undefined,
      blocker: blocker || undefined,
      duration: duration ? parseFloat(duration) : undefined,
    });

    setTitle('');
    setDescription('');
    setPriority(TaskPriority.MEDIUM);
    setDueDate('');
    setDuration('');
    setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
  };

  const isPlanner = defaultStatus !== TaskStatus.DONE;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 transition-all hover:border-indigo-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black flex items-center gap-2 text-slate-800">
          <i className={`fa-solid ${isPlanner ? 'fa-calendar-plus text-indigo-600' : 'fa-pen-nib text-indigo-600'}`}></i>
          {isPlanner ? 'Add New Plan' : 'Log New Activity'}
        </h2>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          {isPlanner ? 'Saved to Planner' : 'Saved to Work Diary'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">
            {isPlanner ? 'What do you need to do?' : 'What did you do?'}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isPlanner ? "Task for the future..." : "Accomplishment for the day..."}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Time Spent (Hours)</label>
          <div className="relative">
            <i className="fa-solid fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="number"
              step="any"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 0.45"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-600"
          >
            <option>Development</option>
            <option>Meeting</option>
            <option>Documentation</option>
            <option>Testing</option>
            <option>Admin</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Collaborator</label>
          <select
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-600"
          >
            {teamMembers.map(member => (
              <option key={member} value={member}>{member === 'Self' ? 'Me (Self)' : member}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 flex items-end">
          <button type="submit" className={`w-full ${isPlanner ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-black uppercase tracking-widest text-[11px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 group`}>
            <i className={`fa-solid ${isPlanner ? 'fa-plus' : 'fa-check-double'} group-hover:scale-110 transition-transform`}></i> 
            {isPlanner ? 'Add to Planner' : 'Log Accomplishment'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TaskForm;
