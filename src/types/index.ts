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

export const taskTypeCategories = {
  'Tax Services': [
    'Personal Tax Preparation',
    'Corporate Tax Preparation',
    'Tax Problem Resolution/Offer & Compromise',
    'Penalty Abatement',
    'Federal/State Representation'
  ],
  'Accounting Services': [
    'Marked Financial Statements',
    'Quickbooks Financial Statements',
    'Payroll',
    'Sales Tax',
    'Initial QB Setup: Chart of Accounts & GL',
    'Audit Services'
  ],
  'Consulting Services': [
    'Business Consulting',
    'Financial Planning',
    'Tax Strategy'
  ]
} as const;

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
  taskType?: string; // Task type from categories
  taskCategory?: string; // Category (Tax Services, Accounting Services, Consulting Services)
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  invoiceDate: Date;
  dueDate: Date;
  period: 'daily' | 'weekly';
  periodStart: Date;
  periodEnd: Date;
  tasks: {
    taskId: string;
    taskTitle: string;
    taskType?: string;
    taskCategory?: string;
    hours: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt: Date;
  createdBy: string; // Admin UID
}
