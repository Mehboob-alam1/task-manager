import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskPriority, User, taskTypeCategories, Invoice } from '../types';
import { createTask, updateTask, getTask, getUsers, createInvoice } from '../firebase/firestore';
import { createNotification } from '../firebase/firestore';
import { format } from 'date-fns';

export const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    clientName: '',
    title: '',
    description: '',
    assignedEmployeeId: '',
    deadline: '',
    priority: 'Medium' as TaskPriority,
    netInvoiceAmount: '',
    taskCategory: '',
    taskType: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // For admin, load all staff users for assignment
    // For staff, they can only create tasks for themselves
    if (user.role === 'admin') {
      const loadUsers = async () => {
        const allUsers = await getUsers();
        setUsers(allUsers.filter((u) => u.role === 'staff'));
      };
      loadUsers();
    } else {
      // Staff can only assign to themselves
      setUsers([user]);
      // Pre-fill assignedEmployeeId for staff
      setFormData(prev => ({
        ...prev,
        assignedEmployeeId: user.uid
      }));
    }

    if (id) {
      const loadTask = async () => {
        const task = await getTask(id);
        if (task) {
          setFormData({
            clientName: task.clientName,
            title: task.title,
            description: task.description,
            assignedEmployeeId: task.assignedEmployeeId,
            deadline: format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm"),
            priority: task.priority,
            netInvoiceAmount: task.netInvoiceAmount.toString(),
            taskCategory: task.taskCategory || '',
            taskType: task.taskType || '',
          });
        }
      };
      loadTask();
    }
  }, [id, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For staff, ensure they can only assign to themselves
      // Manager and admin can assign to anyone
      const assignedEmployeeId = user?.role === 'staff' 
        ? user.uid 
        : formData.assignedEmployeeId;

      if (!assignedEmployeeId) {
        throw new Error('Please select an employee');
      }

      const assignedUser = users.find((u) => u.uid === assignedEmployeeId) || user;
      if (!assignedUser) {
        throw new Error('Please select an employee');
      }

      // Calculate deadline: 48 hours from now (only for new tasks, not when editing)
      const now = new Date();
      const deadline = id 
        ? new Date(formData.deadline) // When editing, use the existing deadline
        : new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours in milliseconds for new tasks

      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        clientName: formData.clientName,
        title: formData.title,
        description: formData.description,
        assignedEmployeeId: assignedEmployeeId,
        assignedEmployeeName: assignedUser.displayName,
        deadline: deadline, // Automatically set to 48 hours from creation for new tasks
        priority: formData.priority,
        estimatedDuration: 48, // Fixed to 48 hours as per deadline
        netInvoiceAmount: parseFloat(formData.netInvoiceAmount),
        status: 'Pending',
        taskCategory: formData.taskCategory || undefined,
        taskType: formData.taskType || undefined,
        createdBy: user!.uid,
      };

      if (id) {
        await updateTask(id, taskData);
      } else {
        const taskId = await createTask(taskData);
        
        // Create invoice automatically when task is created
        const invoiceDate = new Date();
        const invoice: Omit<Invoice, 'id'> = {
          invoiceNumber: `INV-${format(invoiceDate, 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`,
          clientName: formData.clientName,
          invoiceDate: invoiceDate,
          dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          period: 'daily',
          periodStart: invoiceDate,
          periodEnd: invoiceDate,
          tasks: [{
            taskId: taskId,
            taskTitle: formData.title,
            taskType: formData.taskType || undefined,
            taskCategory: formData.taskCategory || undefined,
            hours: 48, // Fixed 48 hours
            rate: taskData.netInvoiceAmount / 48,
            amount: taskData.netInvoiceAmount,
          }],
          subtotal: taskData.netInvoiceAmount,
          discount: 0, // Default discount is 0, user can edit later
          total: taskData.netInvoiceAmount,
          status: 'draft',
          createdAt: invoiceDate,
          createdBy: user!.uid,
          taskId: taskId,
        };
        
        await createInvoice(invoice);
        
        // Create notification for assigned employee (only if not self-assigned)
        if (assignedEmployeeId !== user!.uid) {
          await createNotification({
            userId: assignedEmployeeId,
            title: 'New Task Assigned',
            message: `You have been assigned a new task: ${formData.title}`,
            type: 'task_assigned',
            taskId,
            read: false,
          });
        }
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {id ? 'Edit Task' : user?.role === 'admin' ? 'Create New Task' : 'Create My Task'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
            Client Name *
          </label>
          <input
            type="text"
            id="clientName"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Task Title *
          </label>
          <input
            type="text"
            id="title"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Task Description *
          </label>
          <textarea
            id="description"
            required
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {user?.role === 'admin' ? (
          <div>
            <label htmlFor="assignedEmployeeId" className="block text-sm font-medium text-gray-700">
              Assigned Employee *
            </label>
            <select
              id="assignedEmployeeId"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.assignedEmployeeId}
              onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
            >
              <option value="">Select an employee</option>
              {users.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="assignedEmployeeId" className="block text-sm font-medium text-gray-700">
              Assigned To
            </label>
            <input
              type="text"
              id="assignedEmployeeId"
              value={user?.displayName || 'You'}
              disabled
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">Tasks you create are automatically assigned to you</p>
          </div>
        )}

        <div>
          <label htmlFor="taskCategory" className="block text-sm font-medium text-gray-700 mb-2">
            Task Category *
          </label>
          <select
            id="taskCategory"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.taskCategory}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                taskCategory: e.target.value,
                taskType: '' // Reset task type when category changes
              });
            }}
          >
            <option value="">Select a category</option>
            {Object.keys(taskTypeCategories).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="taskType" className="block text-sm font-medium text-gray-700 mb-2">
            Task Type *
          </label>
          <select
            id="taskType"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.taskType}
            onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
            disabled={!formData.taskCategory}
          >
            <option value="">
              {formData.taskCategory ? 'Select a task type' : 'First select a category'}
            </option>
            {formData.taskCategory && taskTypeCategories[formData.taskCategory as keyof typeof taskTypeCategories]?.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {formData.taskCategory && !formData.taskType && (
            <p className="mt-1 text-sm text-gray-500">
              Available types: {taskTypeCategories[formData.taskCategory as keyof typeof taskTypeCategories]?.join(', ')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {id ? (
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Deadline *
              </label>
              <input
                type="datetime-local"
                id="deadline"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.deadline ? format(new Date(formData.deadline), "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
              <p className="mt-1 text-sm text-gray-500">
                You can modify the deadline when editing a task
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Deadline (Auto-set to 48 hours)
              </label>
              <input
                type="text"
                id="deadline"
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-600 cursor-not-allowed"
                value={format(new Date(Date.now() + 48 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm')}
              />
              <p className="mt-1 text-sm text-gray-500">
                Task deadline is automatically set to 48 hours from creation time
              </p>
            </div>
          )}

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority *
            </label>
            <select
              id="priority"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="netInvoiceAmount" className="block text-sm font-medium text-gray-700">
            Net Invoice Amount ($) *
          </label>
          <input
            type="number"
            id="netInvoiceAmount"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.netInvoiceAmount}
            onChange={(e) => setFormData({ ...formData, netInvoiceAmount: e.target.value })}
          />
          <p className="mt-1 text-sm text-gray-500">
            Task duration is automatically set to 48 hours
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Saving...' : id ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

