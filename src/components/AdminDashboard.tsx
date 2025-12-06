import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Task, User } from '../types';
import { subscribeToTasks, getUsers } from '../firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, Users, PlusCircle, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const loadUsers = async () => {
      try {
        const allUsers = await getUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();

    const unsubscribe = subscribeToTasks((tasks) => {
      setTasks(tasks);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, navigate]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const now = new Date();
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.deadline) < now
  );

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
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome, {user?.displayName} - Manage all tasks and users
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/tasks/create"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <PlusCircle className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Create Task</h3>
              <p className="text-sm text-gray-500">Assign new task to staff</p>
            </div>
          </div>
        </Link>
        <Link
          to="/reports"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">View Reports</h3>
              <p className="text-sm text-gray-500">Daily reports & analytics</p>
            </div>
          </div>
        </Link>
        <Link
          to="/users"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-500">View and manage staff</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {completedTasks.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    In Progress
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {inProgressTasks.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pendingTasks.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overdue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {overdueTasks.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Tasks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Tasks</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No tasks found
            </li>
          ) : (
            tasks.map((task) => (
              <li
                key={task.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Client: {task.clientName} • Assigned to: {task.assignedEmployeeName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span>Status: {task.status}</span>
                    </div>
                  </div>
                  {new Date(task.deadline) < now && task.status !== 'Completed' && (
                    <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Overdue
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Users Summary */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users Overview</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Staff Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.role === 'staff').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

