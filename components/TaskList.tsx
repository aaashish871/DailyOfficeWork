
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
        <p className="text-slate-500 font-black uppercase text-[11px] tracking-[0.2em]">Your diary is empty</p>
        <p className="text-xs text-slate-400 mt-1">Log an activity to track your progress.</p>
      </div>
    );
  }

  // Sort tasks by creation time to create a timeline feel
  const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="relative space-y-4">
      {/* Decorative timeline line */}
      <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-100 -z-10 hidden md:block"></div>

      {sortedTasks.map((task) => {
        const isSelf = !task.blocker || task.blocker === 'Self';
        
        return (
          <div 
            key={task.id} 
            className="group relative bg-white pl-4 pr-6 py-4 md:pl-12 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-100"
          >
            {/* Timeline indicator circle */}
            <div className={`absolute left-[20px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm -ml-0.5 hidden md:flex items-center justify-center transition-colors ${task.status === TaskStatus.DONE ? 'bg-indigo-600' : 'bg-slate-300'}`}>
               {task.status === TaskStatus.DONE && <i className="fa-solid fa-check text-[6px] text-white"></i>}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-slate-200">•</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getPriorityDot(task.priority)}`}></div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{task.category}</span>
                  </div>
                  
                  {/* Responsible badge */}
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isSelf ? 'bg-slate-50 text-slate-400 border border-slate-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                    <i className={`fa-solid ${isSelf ? 'fa-user' : 'fa-users'}`}></i>
                    {isSelf ? 'Self' : task.blocker}
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-800 leading-snug">
                  {task.title}
                </h3>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* Duration Badge with Edit Capability */}
                <div className="relative">
                  {editingDurationId === task.id ? (
                    <div className="flex items-center bg-slate-900 rounded-xl px-2 py-1.5 border border-indigo-500 shadow-lg ring-4 ring-indigo-500/10">
                      <input
                        ref={durationInputRef}
                        type="number"
                        step="any"
                        min="0"
                        value={tempDuration}
                        onChange={(e) => setTempDuration(e.target.value)}
                        onBlur={() => saveDuration(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveDuration(task.id);
                          if (e.key === 'Escape') setEditingDurationId(null);
                        }}
                        className="bg-transparent text-white text-xs font-black w-14 outline-none text-center"
                      />
                      <span className="text-[10px] font-black text-indigo-400">HRS</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingDurationId(task.id); setTempDuration(task.duration?.toString() || '0'); }}
                      className={`h-10 px-4 rounded-xl flex items-center gap-2 border transition-all hover:bg-slate-50 active:scale-95 ${task.duration ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-50 border-dashed border-slate-300 text-slate-300'}`}
                      title="Click to log time"
                    >
                      <i className="fa-solid fa-stopwatch text-indigo-400"></i>
                      <span className="text-sm font-black tracking-tight">{task.duration !== undefined ? `${task.duration}h` : 'Add Time'}</span>
                    </button>
                  )}
                </div>

                {/* Simplified Toggle for ongoing/done if they still want it occasionally */}
                <button 
                  onClick={() => onUpdateStatus(task.id, task.status === TaskStatus.DONE ? TaskStatus.IN_PROGRESS : TaskStatus.DONE)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${task.status === TaskStatus.DONE ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}
                  title={task.status === TaskStatus.DONE ? "Mark as Ongoing" : "Mark as Completed"}
                >
                  <i className={`fa-solid ${task.status === TaskStatus.DONE ? 'fa-check' : 'fa-circle-notch'}`}></i>
                </button>

                {/* Actions Group */}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                  <button
                    onClick={() => setMovingTaskId(task.id === movingTaskId ? null : task.id)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Postpone"
                  >
                    <i className="fa-solid fa-calendar-arrow-right"></i>
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            {movingTaskId === task.id && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    Postpone Activity
                  </h4>
                  <button onClick={() => setMovingTaskId(null)} className="text-indigo-300 hover:text-indigo-500"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Move to Date</label>
                    <input 
                      type="date" 
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                      className="w-full text-sm p-2 rounded-lg border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Reason (Why move this?)</label>
                    <input 
                      type="text"
                      placeholder="e.g. Need more data from team..."
                      value={moveReason}
                      onChange={(e) => setMoveReason(e.target.value)}
                      className="w-full text-sm p-2 rounded-lg border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => { if(moveDate) onMoveTask(task.id, moveDate, moveReason); setMovingTaskId(null); }}
                  disabled={!moveDate}
                  className="mt-3 w-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg disabled:opacity-30 transition-all shadow-md shadow-indigo-200"
                >
                  Update Timeline
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
