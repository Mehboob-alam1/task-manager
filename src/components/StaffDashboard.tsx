import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';
import { subscribeToTasks } from '../firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Staff can view all tasks, but can only update their assigned tasks
    const unsubscribe = subscribeToTasks(
      (tasks) => {
        setTasks(tasks);
        setLoading(false);
      }
      // No employeeId filter - show all tasks
    );

    return unsubscribe;
  }, [user]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const now = new Date();
  const myTasks = tasks.filter((t) => t.assignedEmployeeId === user?.uid);
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.deadline) < now
  );
  const myOverdueTasks = myTasks.filter(
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
          Staff Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome, {user?.displayName} - View all tasks (you can update your assigned tasks)
        </p>
      </div>

      {/* Stats Cards - All Tasks Overview */}
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
                    All Completed
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
                    All In Progress
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
                    All Pending
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
                    My Overdue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {myOverdueTasks.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Tasks Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">My Assigned Tasks</h3>
            <p className="text-sm text-blue-700 mt-1">
              You have {myTasks.length} task{myTasks.length !== 1 ? 's' : ''} assigned to you
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-900">{myTasks.length}</p>
            <p className="text-xs text-blue-600">Total assigned</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div
          onClick={() => navigate('/calendar')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
        >
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">View Calendar</h3>
              <p className="text-sm text-gray-500">See tasks by date</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => navigate('/notifications')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
        >
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-500">View your notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Tasks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">
            You can view all tasks. Tasks assigned to you can be updated.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No tasks found
            </li>
          ) : (
            tasks.map((task) => {
              const isAssignedToMe = task.assignedEmployeeId === user?.uid;
              return (
                <li
                  key={task.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${isAssignedToMe ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {task.title}
                            </p>
                            {isAssignedToMe && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Assigned to me
                              </span>
                            )}
                          </div>
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
                        {task.daysTaken && (
                          <span>Days taken: {task.daysTaken}</span>
                        )}
                      </div>
                    </div>
                    {new Date(task.deadline) < now && task.status !== 'Completed' && (
                      <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Overdue
                      </span>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

