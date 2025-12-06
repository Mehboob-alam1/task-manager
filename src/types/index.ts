export type UserRole = 'admin' | 'staff';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed';

export interface Task {
  id: string;
  clientName: string;
  title: string;
  description: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  deadline: Date;
  priority: TaskPriority;
  estimatedDuration: number; // in hours
  netInvoiceAmount: number;
  status: TaskStatus;
  progressNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  createdBy: string; // Admin UID
  daysTaken?: number;
}

export interface DailyReport {
  id: string;
  date: Date;
  tasksCompletedToday: number;
  tasksPending: number;
  overdueTasks: number;
  taskDetails: {
    taskId: string;
    taskTitle: string;
    daysTaken: number;
    status: TaskStatus;
  }[];
  generatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'deadline_approaching' | 'task_overdue';
  taskId?: string;
  read: boolean;
  createdAt: Date;
}
