export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed';

export const taskTypeCategories = {
  'Tax Services': [
    'Personal Tax Preparation',
    'Corporate Tax Preparation',
    'Tax Problem Resolution/Offer & Compromise',
    'Penalty Abatement',
    'Federal/State Representation',
    '1099 Creation',
    'E-file'
  ],
  'Accounting Services': [
    'Marked Financial Statements',
    'Quickbooks Financial Statements',
    'Payroll',
    'Sales Tax',
    'Initial QB Setup: Chart of Accounts & GL',
    'Audit Services',
    'P&L',
    'Invoice',
    'Compliance Check'
  ],
  'Consulting Services': [
    'Business Consulting',
    'Financial Planning',
    'Tax Strategy',
    'Consulting Call',
    'New Business Setup'
  ],
  'Other': [
    'Other'
  ],
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
  period: 'daily' | 'weekly' | 'monthly';
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
  discount: number; // Discount amount (editable by user)
  discountPercent?: number; // Optional discount percentage
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt: Date;
  createdBy: string; // Admin UID
  taskId?: string; // Link to the task that created this invoice
}

// Permissions System
export type Permission =
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.view_all'
  | 'invoices.create'
  | 'invoices.edit'
  | 'invoices.delete'
  | 'invoices.view_all'
  | 'users.manage'
  | 'users.view_all'
  | 'reports.view'
  | 'reports.generate'
  | 'applications.manage'
  | 'applications.view'
  | 'settings.manage';

export interface UserPermissions {
  userId: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

// Third Party Applications
export type ApplicationType = 'oauth' | 'api_key' | 'webhook' | 'integration';

export type ApplicationStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface ThirdPartyApplication {
  id: string;
  name: string;
  description?: string;
  type: ApplicationType;
  status: ApplicationStatus;
  clientId?: string; // For OAuth
  clientSecret?: string; // For OAuth (encrypted)
  apiKey?: string; // For API key auth (encrypted)
  apiKeyHash?: string; // Hashed version for verification
  redirectUris?: string[]; // For OAuth
  scopes?: string[]; // Permissions requested by the app
  permissions: Permission[]; // What this app can do
  createdBy: string; // User UID who created it
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  rateLimit?: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
}

// User Signup Approval
export interface SignupRequest {
  id: string;
  email: string;
  displayName: string;
  requestedRole: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedBy?: string; // Admin UID
  reviewedAt?: Date;
  rejectionReason?: string;
}
