
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface User {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  avatarColor: string;
  isVerified: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  createdAt: number;
  completedAt?: number;
  dueDate?: string; 
  logDate: string;  
  blocker?: string; 
  postponedReason?: string; 
  duration?: number;
}

export interface DailyLog {
  date: string; 
  tasks: Task[];
  summary?: string;
}
