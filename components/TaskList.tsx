
import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface TaskListProps {
  tasks: Task[];
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
  
  // Inline duration editing state
  const [editingDurationId, setEditingDurationId] = useState<string | null>(null);
  const [tempDuration, setTempDuration] = useState<string>('');
  const durationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingDurationId && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.select();
    }
  }, [editingDurationId]);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'bg-red-100 text-red-700 border-red-200';
      case TaskPriority.MEDIUM: return 'bg-amber-100 text-amber-700 border-amber-200';
      case TaskPriority.LOW: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const handleConfirmMove = (id: string) => {
    if (moveDate && moveReason.trim()) {
      onMoveTask(id, moveDate, moveReason);
      setMovingTaskId(null);
      setMoveDate('');
      setMoveReason('');
    }
  };

  const startEditingDuration = (task: Task) => {
    setEditingDurationId(task.id);
    setTempDuration(task.duration?.toString() || '0');
  };

  const saveDuration = (id: string) => {
    const val = parseFloat(tempDuration);
    if (!isNaN(val)) {
      onUpdateDuration(id, val);
    }
    setEditingDurationId(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
        <i className="fa-solid fa-clipboard-list text-5xl text-slate-200 mb-4"></i>
        <p className="text-slate-400 font-medium">No tasks logged for this day yet.</p>
        <p className="text-xs text-slate-300 mt-1">Start by adding a new task entry above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const currentResponsible = task.blocker || 'Self';
        const isFormerMember = !teamMembers.includes(currentResponsible);

        return (
          <div 
            key={task.id} 
            className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md ${task.status === TaskStatus.DONE ? 'opacity-80' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {task.category}
                  </span>
                  
                  {/* Editable Duration Badge */}
                  <div className="relative">
                    {editingDurationId === task.id ? (
                      <div className="flex items-center bg-slate-900 rounded-full px-1 py-0.5 border border-indigo-500 shadow-lg ring-2 ring-indigo-500/20">
                        <input
                          ref={durationInputRef}
                          type="number"
                          step="0.25"
                          min="0"
                          value={tempDuration}
                          onChange={(e) => setTempDuration(e.target.value)}
                          onBlur={() => saveDuration(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDuration(task.id);
                            if (e.key === 'Escape') setEditingDurationId(null);
                          }}
                          className="bg-transparent text-white text-[10px] font-black w-10 outline-none text-center px-1"
                        />
                        <span className="text-[10px] font-black text-indigo-400 pr-1.5">H</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEditingDuration(task)}
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${
                          task.duration !== undefined 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200 border-dashed hover:bg-slate-200'
                        }`}
                        title="Click to edit duration"
                      >
                        <i className="fa-solid fa-clock"></i>
                        {task.duration !== undefined ? `${task.duration}h` : 'Add Time'}
                      </button>
                    )}
                  </div>

                  {task.dueDate && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${isOverdue(task.dueDate) && task.status !== TaskStatus.DONE ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      <i className="fa-solid fa-calendar-day"></i>
                      Target: {formatAppDate(task.dueDate)}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    Logged at {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <h3 className={`font-bold text-lg leading-tight ${task.status === TaskStatus.DONE ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {task.title}
                </h3>
                
                {task.description && (
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{task.description}</p>
                )}

                {task.postponedReason && (
                  <div className="mt-3 bg-indigo-50/50 border border-indigo-100 p-2 rounded-lg flex items-start gap-2 text-xs text-indigo-700 italic">
                    <i className="fa-solid fa-clock-rotate-left mt-0.5"></i>
                    <span><strong>Reason for Postponing:</strong> {task.postponedReason}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 min-w-[200px]">
                <div className="w-full space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-right">Responsible</label>
                  <select
                    value={currentResponsible}
                    onChange={(e) => onUpdateResponsible(task.id, e.target.value)}
                    className={`w-full text-xs font-bold px-3 py-1.5 rounded-lg border outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-right cursor-pointer ${isFormerMember ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    {isFormerMember && (
                      <option value={currentResponsible}>{currentResponsible} (Former)</option>
                    )}
                    {teamMembers.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full justify-end">
                  <select
                    value={task.status}
                    onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none transition-all border cursor-pointer ${
                      task.status === TaskStatus.DONE 
                        ? 'bg-emerald-500 text-white border-emerald-600' 
                        : task.status === TaskStatus.IN_PROGRESS 
                        ? 'bg-blue-500 text-white border-blue-600' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>Working</option>
                    <option value={TaskStatus.DONE}>Complete</option>
                  </select>
                  
                  {task.status !== TaskStatus.DONE && (
                    <button
                      onClick={() => setMovingTaskId(task.id === movingTaskId ? null : task.id)}
                      className={`p-1.5 rounded-lg transition-all ${movingTaskId === task.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      title="Postpone/Move to another day"
                    >
                      <i className="fa-solid fa-calendar-plus"></i>
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete task"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>

            {movingTaskId === task.id && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-reply-all transform rotate-180"></i>
                  Postpone Task
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Select New Date</label>
                    <input 
                      type="date" 
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                      className="w-full text-sm p-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {moveDate && <p className="text-[10px] font-bold text-indigo-600">{formatAppDate(moveDate)}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Reason for not completing on {formatAppDate(task.logDate)}</label>
                    <textarea 
                      placeholder="e.g., Higher priority emergency tasks took over..."
                      value={moveReason}
                      onChange={(e) => setMoveReason(e.target.value)}
                      className="w-full text-sm p-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button 
                    onClick={() => setMovingTaskId(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleConfirmMove(task.id)}
                    disabled={!moveDate || !moveReason.trim()}
                    className="bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-indigo-700 shadow-md shadow-indigo-100"
                  >
                    Move Task
                  </button>
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
