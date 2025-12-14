import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskStatus } from '../types';
import { getTask, updateTask, deleteTask } from '../firebase/firestore';
import { format } from 'date-fns';
import { Trash2, Edit } from 'lucide-react';

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [progressNotes, setProgressNotes] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadTask = async () => {
      const taskData = await getTask(id);
      if (taskData) {
        setTask(taskData);
        setStatus(taskData.status);
        setProgressNotes(taskData.progressNotes || '');
      }
      setLoading(false);
    };

    loadTask();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!task || !id) return;
    setUpdating(true);

    try {
      await updateTask(id, {
        status,
        progressNotes: progressNotes || undefined,
      });
      const updatedTask = await getTask(id);
      if (updatedTask) {
        setTask(updatedTask);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !user || user.role !== 'admin') return;
    
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!task) {
    return <div className="text-center py-12">Task not found</div>;
  }

  const isAssigned = user?.uid === task.assignedEmployeeId || user?.role === 'admin';
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'Completed';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
            <p className="mt-2 text-gray-600">Client: {task.clientName}</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <div className="flex space-x-2">
              <button
                onClick={() => navigate(`/tasks/edit/${task.id}`)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-1 text-sm text-gray-900">{task.status}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Priority</h3>
            <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Assigned To</h3>
            <p className="mt-1 text-sm text-gray-900">{task.assignedEmployeeName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Deadline</h3>
            <p className={`mt-1 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
              {format(new Date(task.deadline), 'MMMM dd, yyyy')}
              {isOverdue && ' (Overdue)'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Estimated Duration</h3>
            <p className="mt-1 text-sm text-gray-900">{task.estimatedDuration} hours</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Net Invoice Amount</h3>
            <p className="mt-1 text-sm text-gray-900">${task.netInvoiceAmount.toFixed(2)}</p>
          </div>
          {task.daysTaken && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Days Taken</h3>
              <p className="mt-1 text-sm text-gray-900">{task.daysTaken} days</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{task.description}</p>
        </div>

        {isAssigned && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Task Status</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="progressNotes" className="block text-sm font-medium text-gray-700">
                  Progress Notes (Optional)
                </label>
                <textarea
                  id="progressNotes"
                  rows={4}
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about the task progress..."
                />
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}

        {task.progressNotes && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Progress Notes</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{task.progressNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

