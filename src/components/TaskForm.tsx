import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskPriority, User, taskTypeCategories } from '../types';
import { createTask, updateTask, getTask, getUsers } from '../firebase/firestore';
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
    estimatedDuration: '',
    netInvoiceAmount: '',
    taskCategory: '',
    taskType: '',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const loadUsers = async () => {
      const allUsers = await getUsers();
      setUsers(allUsers.filter((u) => u.role === 'staff'));
    };

    loadUsers();

    if (id) {
      const loadTask = async () => {
        const task = await getTask(id);
        if (task) {
          setFormData({
            clientName: task.clientName,
            title: task.title,
            description: task.description,
            assignedEmployeeId: task.assignedEmployeeId,
            deadline: format(new Date(task.deadline), 'yyyy-MM-dd'),
            priority: task.priority,
            estimatedDuration: task.estimatedDuration.toString(),
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
      const assignedUser = users.find((u) => u.uid === formData.assignedEmployeeId);
      if (!assignedUser) {
        throw new Error('Please select an employee');
      }

      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        clientName: formData.clientName,
        title: formData.title,
        description: formData.description,
        assignedEmployeeId: formData.assignedEmployeeId,
        assignedEmployeeName: assignedUser.displayName,
        deadline: new Date(formData.deadline),
        priority: formData.priority,
        estimatedDuration: parseFloat(formData.estimatedDuration),
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
        
        // Create notification for assigned employee
        await createNotification({
          userId: formData.assignedEmployeeId,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${formData.title}`,
          type: 'task_assigned',
          taskId,
          read: false,
        });
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
        {id ? 'Edit Task' : 'Create New Task'}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="taskCategory" className="block text-sm font-medium text-gray-700">
              Task Category
            </label>
            <select
              id="taskCategory"
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
            <label htmlFor="taskType" className="block text-sm font-medium text-gray-700">
              Task Type
            </label>
            <select
              id="taskType"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.taskType}
              onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
              disabled={!formData.taskCategory}
            >
              <option value="">Select a type</option>
              {formData.taskCategory && taskTypeCategories[formData.taskCategory as keyof typeof taskTypeCategories]?.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
              Deadline *
            </label>
            <input
              type="date"
              id="deadline"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700">
              Estimated Duration (hours) *
            </label>
            <input
              type="number"
              id="estimatedDuration"
              required
              min="0"
              step="0.5"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
            />
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
          </div>
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

