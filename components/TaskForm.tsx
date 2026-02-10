
import React, { useState, useEffect } from 'react';
import { TaskStatus, TaskPriority, Task } from '../types';

interface TaskFormProps {
  // Fix: logDate is derived in the parent Dashboard component, so it is omitted from the submission payload
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'logDate'>) => void;
  teamMembers: string[];
}

const TaskForm: React.FC<TaskFormProps> = ({ onAdd, teamMembers }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [category, setCategory] = useState('Development');
  const [dueDate, setDueDate] = useState('');
  const [blocker, setBlocker] = useState('Self');

  // Safety check: if current blocker is removed from team, reset to 'Self' or first available
  useEffect(() => {
    if (!teamMembers.includes(blocker)) {
      setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
    }
  }, [teamMembers]);

  /**
   * Helper to preview format as 10-Feb-2026
   */
  const formatAppDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    return `${day}-${months[mIdx]}-${year}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // logDate is intentionally omitted as it is handled in Dashboard.addTask
    onAdd({
      title,
      description,
      status: TaskStatus.TODO,
      priority,
      category,
      dueDate: dueDate || undefined,
      blocker: blocker || undefined,
    });

    setTitle('');
    setDescription('');
    setPriority(TaskPriority.MEDIUM);
    setDueDate('');
    setBlocker(teamMembers.includes('Self') ? 'Self' : (teamMembers[0] || ''));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
        <i className="fa-solid fa-plus-circle text-indigo-600"></i>
        Log New Task
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">What are you working on?</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Fixing Login Bug"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option>Development</option>
            <option>Meeting</option>
            <option>Documentation</option>
            <option>Testing</option>
            <option>Admin</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion Target (Due Date)</label>
          <div className="relative">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
          {dueDate && (
            <div className="mt-1 flex items-center gap-2">
               <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded uppercase tracking-tighter">Formatted</span>
               <p className="text-sm font-bold text-indigo-600 tracking-tight">{formatAppDate(dueDate)}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Responsible Person</label>
          <select
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {teamMembers.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Additional Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional context for your manager..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none placeholder:text-slate-300"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority Level</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value={TaskPriority.LOW}>Low - No rush</option>
            <option value={TaskPriority.MEDIUM}>Medium - Normal</option>
            <option value={TaskPriority.HIGH}>High - Critical</option>
          </select>
        </div>

        <div className="flex items-end">
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95">
            <i className="fa-solid fa-floppy-disk"></i> Save Entry
          </button>
        </div>
      </div>
    </form>
  );
};

export default TaskForm;
