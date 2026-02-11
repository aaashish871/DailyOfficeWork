
import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface TaskListProps {
  tasks: Array<Task>;
  teamMembers: string[];
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onUpdateResponsible: (id: string, responsible: string) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onDelete: (id: string) => void;
  onMoveTask: (id: string, newDate: string, reason: string) => void;
}

const formatAppDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(month, 10) - 1;
  return `${day}-${months[mIdx]}-${year}`;
};

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  teamMembers, 
  onUpdateStatus, 
  onUpdateResponsible, 
  onUpdateDuration,
  onDelete, 
  onMoveTask 
}) => {
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveReason, setMoveReason] = useState('');
  
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [tempDuration, setTempDuration] = useState<string>('');
  const durationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingDurationId && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.select();
    }
  }, [editingDurationId]);

  const saveDuration = (id: string) => {
    const val = parseFloat(tempDuration);
    if (!isNaN(val)) onUpdateDuration(id, val);
    setEditingDurationId(null);
  };

  const getPriorityDot = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'bg-red-500';
      case TaskPriority.MEDIUM: return 'bg-amber-500';
      case TaskPriority.LOW: return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-[2rem] border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-clipboard-list text-3xl text-slate-200"></i>
        </div>
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Timeline Empty</p>
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      {sortedTasks.map((task) => {
        const isSelf = !task.blocker || task.blocker === 'Self';
        const isDone = task.status === TaskStatus.DONE;
        
        return (
          <div 
            key={task.id} 
            className={`group relative bg-white pl-4 pr-6 py-5 md:pl-10 rounded-3xl border transition-all ${isDone ? 'border-emerald-100 bg-emerald-50/5 shadow-sm shadow-emerald-50/50' : 'border-slate-200 hover:border-indigo-100 shadow-sm'}`}
          >
            {/* Left Status Marker */}
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-full transition-colors hidden md:block ${isDone ? 'bg-emerald-500' : 'bg-slate-100 group-hover:bg-indigo-400'}`}></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {isDone ? `Finished` : `Planned`}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)}`}></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{task.category}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    {isDone ? new Date(task.completedAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* REMOVED strikethrough for readability */}
                <h3 className={`text-base font-black leading-tight transition-colors ${isDone ? 'text-slate-700' : 'text-slate-800'}`}>
                  {task.title}
                </h3>
                
                {!isSelf && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase text-indigo-400">Linked to:</span>
                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{task.blocker}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Duration */}
                <div className="relative">
                  {editingDurationId === task.id ? (
                    <div className="flex items-center bg-slate-900 rounded-xl px-2 py-2 border border-indigo-500 shadow-2xl">
                      <input
                        ref={durationInputRef}
                        type="number"
                        step="any"
                        min="0"
                        value={tempDuration}
                        onChange={(e) => setTempDuration(e.target.value)}
                        onBlur={() => saveDuration(task.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveDuration(task.id); if (e.key === 'Escape') setEditingDurationId(null); }}
                        className="bg-transparent text-white text-xs font-black w-14 outline-none text-center"
                      />
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingDurationId(task.id); setTempDuration(task.duration?.toString() || '0'); }}
                      className={`h-10 px-4 rounded-xl flex items-center gap-2 border text-[10px] font-black uppercase tracking-widest transition-all ${task.duration ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}
                    >
                      <i className="fa-solid fa-stopwatch opacity-40"></i>
                      {task.duration !== undefined ? `${task.duration}h` : 'Add Time'}
                    </button>
                  )}
                </div>

                {/* Status Toggle */}
                {!isDone ? (
                   <button 
                    onClick={() => onUpdateStatus(task.id, TaskStatus.DONE)}
                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-bolt"></i> Finish
                  </button>
                ) : (
                  <button 
                    onClick={() => onUpdateStatus(task.id, TaskStatus.IN_PROGRESS)}
                    className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100"
                  >
                    <i className="fa-solid fa-check-double"></i>
                  </button>
                )}

                {/* Actions */}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                  {!isDone && (
                    <button onClick={() => setMovingTaskId(task.id === movingTaskId ? null : task.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                      <i className="fa-solid fa-calendar-day"></i>
                    </button>
                  )}
                  <button onClick={() => onDelete(task.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>

            {movingTaskId === task.id && (
              <div className="mt-5 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Reschedule to</label>
                    <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-indigo-100 outline-none bg-white font-black text-slate-700"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Reason</label>
                    <input type="text" placeholder="e.g. Waiting for data..." value={moveReason} onChange={(e) => setMoveReason(e.target.value)} className="w-full text-xs p-3 rounded-xl border border-indigo-100 outline-none bg-white font-medium"/>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setMovingTaskId(null)} className="flex-1 text-[9px] font-black uppercase text-slate-400">Discard</button>
                  <button onClick={() => { if(moveDate) onMoveTask(task.id, moveDate, moveReason); setMovingTaskId(null); }} className="flex-[2] bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-indigo-100">Confirm Schedule Update</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
