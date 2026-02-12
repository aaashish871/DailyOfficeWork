
import React, { useState, useEffect } from 'react';
import { TaskStatus, TaskPriority, Task } from '../types';

interface TaskFormProps {
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => void;
  onManageCategories?: () => void;
  teamMembers: string[];
  categories: string[];
  defaultStatus?: TaskStatus;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAdd, onManageCategories, teamMembers, categories, defaultStatus = TaskStatus.DONE }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState(''); // New state for task notes
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [category, setCategory] = useState(categories[0] || 'Meeting');
  const [blocker, setBlocker] = useState('Self');
  const [duration, setDuration] = useState<string>('');
  const [unit, setUnit] = useState<'hrs' | 'mins'>('hrs');

  useEffect(() => {
    if (!teamMembers.includes(blocker)) {
      setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
    }
  }, [teamMembers]);

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory(categories[0] || 'Meeting');
    }
  }, [categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const numValue = duration ? parseFloat(duration) : undefined;
    const durationInHours = (numValue !== undefined && unit === 'mins') 
      ? Number((numValue / 60).toFixed(2)) 
      : numValue;

    onAdd({
      title,
      description,
      notes: notes.trim() || undefined,
      status: defaultStatus,
      priority,
      category,
      blocker: blocker || undefined,
      duration: durationInHours,
    });

    setTitle('');
    setDescription('');
    setNotes('');
    setPriority(TaskPriority.MEDIUM);
    setDuration('');
    setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
    setUnit('hrs'); // Reset to default
  };

  const isPlanner = defaultStatus !== TaskStatus.DONE;

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
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Time Investment</label>
          <div className="relative group/time">
            <i className="fa-solid fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="number"
              step="any"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full pl-10 pr-20 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-700 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-slate-200/50 p-0.5 rounded-lg border border-slate-200 shadow-inner">
               <button 
                type="button" 
                onClick={() => setUnit('hrs')} 
                className={`text-[7px] font-black uppercase px-2 py-1 rounded-md transition-all ${unit === 'hrs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Hrs
               </button>
               <button 
                type="button" 
                onClick={() => setUnit('mins')} 
                className={`text-[7px] font-black uppercase px-2 py-1 rounded-md transition-all ${unit === 'mins' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Min
               </button>
            </div>
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

        {/* New Row for Notes and Category */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Strategy / Hints / Context</label>
          <div className="relative">
            <i className="fa-solid fa-note-sticky absolute left-4 top-4 text-slate-300"></i>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add specific hints or reminders for this task..."
              rows={1}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium text-slate-600 min-h-[54px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Category</label>
            {onManageCategories && (
              <button 
                type="button" 
                onClick={onManageCategories}
                className="text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                <i className="fa-solid fa-gear mr-1"></i> Manage
              </button>
            )}
          </div>
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

        <div className="md:col-span-2"></div>

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
