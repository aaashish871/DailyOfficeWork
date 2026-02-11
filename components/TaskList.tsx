
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
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-mug-hot text-2xl text-slate-300"></i>
        </div>
        <p className="text-slate-500 font-black uppercase text-[11px] tracking-[0.2em]">No entries found here</p>
        <p className="text-xs text-slate-400 mt-1">Start by adding a new task or plan above.</p>
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="relative space-y-4">
      {sortedTasks.map((task) => {
        const isSelf = !task.blocker || task.blocker === 'Self';
        const isDone = task.status === TaskStatus.DONE;
        
        return (
          <div 
            key={task.id} 
            className={`group relative bg-white pl-4 pr-6 py-4 md:pl-12 rounded-2xl border transition-all hover:shadow-md ${isDone ? 'border-slate-200 opacity-90' : 'border-indigo-100 shadow-sm'}`}
          >
            {/* Left Indicator */}
            <div className={`absolute left-[20px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm -ml-0.5 hidden md:flex items-center justify-center transition-colors ${isDone ? 'bg-indigo-600' : 'bg-slate-200 group-hover:bg-indigo-400'}`}>
               {isDone && <i className="fa-solid fa-check text-[6px] text-white"></i>}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {isDone ? `Completed at ${new Date(task.completedAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Logged at ${new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                  <span className="text-slate-200">•</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)}`}></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{task.category}</span>
                  </div>
                  
                  {!isDone && (
                    <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border border-indigo-100">
                       Planned Task
                    </span>
                  )}
                </div>
                
                <h3 className={`font-bold leading-snug ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </h3>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* Duration Edit */}
                <div className="relative">
                  {editingDurationId === task.id ? (
                    <div className="flex items-center bg-slate-900 rounded-xl px-2 py-1.5 border border-indigo-500">
                      <input
                        ref={durationInputRef}
                        type="number"
                        step="any"
                        min="0"
                        value={tempDuration}
                        onChange={(e) => setTempDuration(e.target.value)}
                        onBlur={() => saveDuration(task.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveDuration(task.id); if (e.key === 'Escape') setEditingDurationId(null); }}
                        className="bg-transparent text-white text-xs font-black w-12 outline-none text-center"
                      />
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingDurationId(task.id); setTempDuration(task.duration?.toString() || '0'); }}
                      className={`h-9 px-3 rounded-lg flex items-center gap-2 border text-xs font-black transition-all ${task.duration ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'}`}
                    >
                      <i className="fa-solid fa-stopwatch opacity-50"></i>
                      {task.duration !== undefined ? `${task.duration}h` : 'Add Time'}
                    </button>
                  )}
                </div>

                {/* Completion Toggle */}
                <button 
                  onClick={() => onUpdateStatus(task.id, isDone ? TaskStatus.IN_PROGRESS : TaskStatus.DONE)}
                  className={`px-4 h-9 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isDone ? 'bg-emerald-500 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100'}`}
                >
                  {isDone ? <><i className="fa-solid fa-check"></i> Done</> : <><i className="fa-solid fa-bolt"></i> Finish Now</>}
                </button>

                {/* Actions */}
                <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                  {!isDone && (
                    <button
                      onClick={() => setMovingTaskId(task.id === movingTaskId ? null : task.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600"
                      title="Postpone"
                    >
                      <i className="fa-solid fa-calendar-days text-sm"></i>
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            {movingTaskId === task.id && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Reschedule to</label>
                    <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-indigo-100 outline-none bg-white"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Comment</label>
                    <input type="text" placeholder="Why reschedule?" value={moveReason} onChange={(e) => setMoveReason(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-indigo-100 outline-none bg-white"/>
                  </div>
                </div>
                <button 
                  onClick={() => { if(moveDate) onMoveTask(task.id, moveDate, moveReason); setMovingTaskId(null); }}
                  className="mt-3 w-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg shadow-md shadow-indigo-100"
                >
                  Update Planner
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
