
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
      case TaskPriority.HIGH: return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      case TaskPriority.MEDIUM: return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case TaskPriority.LOW: return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      default: return 'bg-slate-400';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-list-ul text-3xl text-slate-200"></i>
        </div>
        <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.4em]">Empty List</p>
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-5">
      {sortedTasks.map((task) => {
        const isSelf = !task.blocker || task.blocker === 'Self';
        const isDone = task.status === TaskStatus.DONE;
        
        return (
          <div 
            key={task.id} 
            className={`group relative bg-white pl-4 pr-6 py-6 md:pl-10 rounded-[2rem] border transition-all ${isDone ? 'border-emerald-100 bg-emerald-50/5 shadow-sm shadow-emerald-50/20' : 'border-slate-200 hover:border-indigo-100 shadow-sm'}`}
          >
            {/* Vertical Marker */}
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full transition-all hidden md:block ${isDone ? 'bg-emerald-500' : 'bg-slate-100 group-hover:bg-indigo-400'}`}></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <div className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isDone ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    {isDone ? 'Accomplished' : 'Scheduled Plan'}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${getPriorityDot(task.priority)}`}></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{task.category}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    <i className="fa-solid fa-clock mr-1.5 opacity-50"></i>
                    {isDone ? new Date(task.completedAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* Title - No Cross Line (Strikethrough) as requested */}
                <h3 className={`text-lg font-black leading-tight transition-colors ${isDone ? 'text-slate-800' : 'text-slate-800'}`}>
                  {task.title}
                </h3>
                
                {!isSelf && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Collab:</span>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{task.blocker}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* Time Log */}
                <div className="relative">
                  {editingDurationId === task.id ? (
                    <div className="flex items-center bg-slate-900 rounded-2xl px-3 py-2.5 border border-indigo-500 shadow-2xl">
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
                        autoFocus
                      />
                      <span className="text-[9px] font-black text-indigo-400 ml-1">HRS</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingDurationId(task.id); setTempDuration(task.duration?.toString() || '0'); }}
                      className={`h-12 px-5 rounded-2xl flex items-center gap-3 border text-[10px] font-black uppercase tracking-widest transition-all ${task.duration ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}
                    >
                      <i className="fa-solid fa-stopwatch text-indigo-500 opacity-60"></i>
                      {task.duration !== undefined ? `${task.duration}h` : 'Add Time'}
                    </button>
                  )}
                </div>

                {/* Status Toggle Button */}
                {!isDone ? (
                   <button 
                    onClick={() => onUpdateStatus(task.id, TaskStatus.DONE)}
                    className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 flex items-center gap-3"
                  >
                    <i className="fa-solid fa-bolt"></i> Finish Now
                  </button>
                ) : (
                  <button 
                    onClick={() => onUpdateStatus(task.id, TaskStatus.IN_PROGRESS)}
                    className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-100 transition-all hover:scale-105 active:scale-95"
                  >
                    <i className="fa-solid fa-check-double text-xl"></i>
                  </button>
                )}

                {/* Row Actions */}
                <div className="flex items-center bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                  {!isDone && (
                    <button onClick={() => setMovingTaskId(task.id === movingTaskId ? null : task.id)} className="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white transition-all flex items-center justify-center">
                      <i className="fa-solid fa-calendar-day"></i>
                    </button>
                  )}
                  <button onClick={() => onDelete(task.id)} className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-white transition-all flex items-center justify-center">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>

            {movingTaskId === task.id && (
              <div className="mt-6 p-6 bg-indigo-50/40 rounded-[2rem] border border-indigo-100 animate-in slide-in-from-top-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">New Log Date</label>
                    <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className="w-full text-sm p-4 rounded-2xl border border-indigo-100 outline-none bg-white font-black text-slate-700 shadow-sm"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Reschedule Comment</label>
                    <input type="text" placeholder="Explain the delay..." value={moveReason} onChange={(e) => setMoveReason(e.target.value)} className="w-full text-sm p-4 rounded-2xl border border-indigo-100 outline-none bg-white font-medium shadow-sm"/>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setMovingTaskId(null)} className="flex-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancel</button>
                  <button onClick={() => { if(moveDate) onMoveTask(task.id, moveDate, moveReason); setMovingTaskId(null); }} className="flex-[3] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-slate-200">Save New Schedule</button>
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
