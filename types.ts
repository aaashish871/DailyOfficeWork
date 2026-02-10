
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
  dueDate?: string; // Target completion date
  logDate: string;  // The date this task belongs to (YYYY-MM-DD)
  blocker?: string; // Information about why it's pending/blocked
  postponedReason?: string; // Why this task was moved from its original date
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  summary?: string;
}
