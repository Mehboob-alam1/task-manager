import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, Invoice } from '../types';
import { subscribeToPipelineFilesCount, subscribeToTasks, subscribeToInvoices } from '../firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, Calendar, DollarSign, PlusCircle, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pipelineCount, setPipelineCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Staff can only view their own assigned tasks
    const unsubscribeTasks = subscribeToTasks(
      (allTasks) => {
        // Filter to show only tasks assigned to this staff member
        const myAssignedTasks = allTasks.filter(t => t.assignedEmployeeId === user.uid);
        setTasks(myAssignedTasks);
        setLoading(false);
      },
      user.uid // Filter by employee ID
    );

    // Subscribe to invoices for this staff member
    const unsubscribeInvoices = subscribeToInvoices(
      (invoices) => {
        setInvoices(invoices);
      },
      user.uid
    );
    const unsubscribePipeline = subscribeToPipelineFilesCount(setPipelineCount);

    return () => {
      unsubscribeTasks();
      unsubscribeInvoices();
      unsubscribePipeline();
    };
  }, [user]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const now = new Date();
  // All tasks shown are already filtered to be assigned to this staff member
  const myTasks = tasks;
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress');
  const myOverdueTasks = tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.deadline) < now
  );

  // Calculate billing totals
  const dailyBillingTotal = invoices
    .filter(inv => inv.period === 'daily')
    .reduce((sum, inv) => sum + inv.total, 0);

  const weeksEndBillingTotal = invoices
    .filter(inv => inv.period === 'weekly')
    .reduce((sum, inv) => sum + inv.total, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-200 text-red-900';
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
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.displayName || 'Staff'} Dashboard
            </h1>
        <p className="mt-2 text-gray-600">
          Welcome - View and manage your assigned tasks
        </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Daily Billing Box */}
            <div className="bg-white shadow rounded-lg p-4 min-w-[180px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Daily Billing</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${dailyBillingTotal.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>
            {/* Weeks End Billing Box */}
            <div className="bg-white shadow rounded-lg p-4 min-w-[180px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Weeks End Billing</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${weeksEndBillingTotal.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - My Tasks Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
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
                    <span className="inline-flex items-center">
                      My Overdue
                      {myOverdueTasks.length > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Alert
                        </span>
                      )}
                    </span>
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {myOverdueTasks.length}
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
                <Inbox className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Files in Pipeline
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pipelineCount}
                  </dd>
                </dl>
              </div>
            </div>
            <p className="mt-2 text-xs text-purple-600">Waiting assignment</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div
          onClick={() => navigate('/tasks/create')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
        >
          <div className="flex items-center">
            <PlusCircle className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Create Task</h3>
              <p className="text-sm text-gray-500">Create a new task for yourself</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => navigate('/calendar')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
        >
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600 mr-3" />
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

      {/* My Tasks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tasks assigned to you. Click on any task to view details and update status.
              </p>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        <ul className="divide-y divide-gray-200">
          {(() => {
            const filteredTasks = tasks.filter((task) => {
              if (filterStatus === 'all') return true;
              if (filterStatus === 'overdue') {
                return task.status !== 'Completed' && new Date(task.deadline) < now;
              }
              return task.status === filterStatus;
            });
            
            return filteredTasks.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-500">
                No {filterStatus === 'all' ? '' : filterStatus.toLowerCase()} tasks assigned to you
              </li>
            ) : (
              filteredTasks.map((task) => (
              <li
                key={task.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer bg-blue-50 border-l-4 border-blue-500"
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
                          Client: {task.clientName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 flex-wrap gap-2">
                      <span>Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy HH:mm')}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span>Status: {task.status}</span>
                      {task.createdAt && (
                        <span className="text-blue-600 font-medium">
                          ⏱️ Elapsed: {Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60))}h {Math.floor(((now.getTime() - new Date(task.createdAt).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m
                        </span>
                      )}
                      {task.createdAt && (
                        <span className={`font-medium ${(() => {
                          const remaining = new Date(task.deadline).getTime() - now.getTime();
                          if (remaining <= 0) return 'text-red-600';
                          if (remaining < 12 * 60 * 60 * 1000) return 'text-orange-600';
                          return 'text-green-600';
                        })()}`}>
                          ⏳ Remaining: {(() => {
                            const remaining = new Date(task.deadline).getTime() - now.getTime();
                            if (remaining <= 0) return 'Overdue';
                            const hours = Math.floor(remaining / (1000 * 60 * 60));
                            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                            return `${hours}h ${minutes}m`;
                          })()}
                        </span>
                      )}
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
              ))
            );
          })()}
        </ul>
      </div>
    </div>
  );
};
