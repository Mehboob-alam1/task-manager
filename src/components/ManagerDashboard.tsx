import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Task, User } from '../types';
import { subscribeToPipelineFilesCount, subscribeToTasks, getUsers } from '../firebase/firestore';
import { format, differenceInMinutes, isPast } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, Users, PlusCircle, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [pipelineCount, setPipelineCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      navigate('/dashboard');
      return;
    }

    const loadUsers = async () => {
      try {
        const allUsers = await getUsers();
        // Manager can see all staff members
        setUsers(allUsers.filter(u => u.role === 'staff'));
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();

    const unsubscribeTasks = subscribeToTasks((tasks) => {
      setTasks(tasks);
      setLoading(false);
    });
    const unsubscribePipeline = subscribeToPipelineFilesCount(setPipelineCount);

    return () => {
      unsubscribeTasks();
      unsubscribePipeline();
    };
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

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        if (task.status === 'Completed' || new Date(task.deadline) >= now) {
          return false;
        }
      } else if (task.status !== filterStatus) {
        return false;
      }
    }

    // Client filter
    if (filterClient !== 'all' && task.clientName !== filterClient) {
      return false;
    }

    // Employee filter
    if (filterEmployee !== 'all' && task.assignedEmployeeId !== filterEmployee) {
      return false;
    }

    return true;
  });

  // Get unique clients and employees for dropdowns
  const clients = Array.from(new Set(tasks.map((t) => t.clientName))).sort();
  const employees = users.filter((u) => u.role === 'staff');

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

  const formatDuration = (minutes: number) => {
    if (minutes < 0) return 'Overdue';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getRemainingTimeColor = (deadline: Date) => {
    const now = new Date();
    const diffMinutes = differenceInMinutes(deadline, now);
    if (diffMinutes <= 0) return 'text-red-600 font-semibold';
    if (diffMinutes <= 12 * 60) return 'text-orange-600 font-semibold'; // Less than 12 hours
    return 'text-green-600';
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="mt-2 text-gray-600">
              View and manage all tasks and staff members
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/tasks/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Task
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
                      Overdue
                      {overdueTasks.length > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Alert
                        </span>
                      )}
                    </span>
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {overdueTasks.length}
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

      {/* Staff Members Summary */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {employees.length === 0 ? (
              <p className="text-sm text-gray-500">No staff members found</p>
            ) : (
              employees.map((employee) => {
                const employeeTasks = tasks.filter((t) => t.assignedEmployeeId === employee.uid);
                const employeeCompleted = employeeTasks.filter((t) => t.status === 'Completed').length;
                const employeePending = employeeTasks.filter((t) => t.status === 'Pending').length;
                const employeeInProgress = employeeTasks.filter((t) => t.status === 'In Progress').length;

                return (
                  <div
                    key={employee.uid}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {employee.displayName}
                      </h3>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Total Tasks:</span>
                        <span className="font-medium text-gray-900">{employeeTasks.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="text-green-600">{employeeCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>In Progress:</span>
                        <span className="text-blue-600">{employeeInProgress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <span className="text-yellow-600">{employeePending}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* All Tasks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">All Tasks</h2>
            <div className="flex space-x-3">
              {/* Status Filter Dropdown */}
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

              {/* Client Filter Dropdown */}
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Clients</option>
                {clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>

              {/* Employee Filter Dropdown */}
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee.uid} value={employee.uid}>
                    {employee.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all tasks across the firm.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No tasks found
            </li>
          ) : (
            filteredTasks.map((task) => {
              const now = new Date();
              const timeElapsedMinutes = differenceInMinutes(now, task.createdAt);
              const timeRemainingMinutes = differenceInMinutes(task.deadline, now);
              const isOverdue = isPast(task.deadline) && task.status !== 'Completed';

              return (
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
                        <span>Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy HH:mm')}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span>Status: {task.status}</span>
                        {task.status !== 'Completed' && (
                          <>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-gray-500" />
                              Time Spent: {formatDuration(timeElapsedMinutes)}
                            </span>
                            <span className={`flex items-center ${getRemainingTimeColor(task.deadline)}`}>
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Time Remaining: {formatDuration(timeRemainingMinutes)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isOverdue && (
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
