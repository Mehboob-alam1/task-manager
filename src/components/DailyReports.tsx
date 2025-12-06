import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DailyReport, Task } from '../types';
import { getDailyReports, getTasks } from '../firebase/firestore';
import { format } from 'date-fns';
import { BarChart3, Download } from 'lucide-react';

export const DailyReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const loadData = async () => {
      const [reportsData, tasksData] = await Promise.all([
        getDailyReports(),
        getTasks(),
      ]);
      setReports(reportsData);
      setTasks(tasksData);
      setLoading(false);
    };

    loadData();
  }, [user]);

  const generateTodayReport = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksCompletedToday = tasks.filter(
      (task) =>
        task.status === 'Completed' &&
        task.completedAt &&
        new Date(task.completedAt) >= today &&
        new Date(task.completedAt) < tomorrow
    );

    const tasksPending = tasks.filter((task) => task.status === 'Pending');
    const overdueTasks = tasks.filter(
      (task) =>
        task.status !== 'Completed' && new Date(task.deadline) < new Date()
    );

    const taskDetails = tasksCompletedToday.map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      daysTaken: task.daysTaken || 0,
      status: task.status,
    }));

    return {
      date: today,
      tasksCompletedToday: tasksCompletedToday.length,
      tasksPending: tasksPending.length,
      overdueTasks: overdueTasks.length,
      taskDetails,
    };
  };

  const todayReport = generateTodayReport();

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (user?.role !== 'admin') {
    return <div className="text-center py-12">Access denied. Admin only.</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Daily Reports</h1>
        <button
          onClick={() => {
            // In production, this would trigger a Cloud Function
            alert('Daily report generation is automated via Cloud Functions');
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Today's Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Today's Summary ({format(new Date(), 'MMMM dd, yyyy')})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-900">
                  {todayReport.tasksCompletedToday}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {todayReport.tasksPending}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-red-600">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-900">
                  {todayReport.overdueTasks}
                </p>
              </div>
            </div>
          </div>
        </div>

        {todayReport.taskDetails.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Tasks Completed Today
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Taken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayReport.taskDetails.map((detail) => (
                    <tr key={detail.taskId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {detail.taskTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {detail.daysTaken} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {detail.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Historical Reports */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Historical Reports</h2>
        {reports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No historical reports available. Reports are generated automatically via Cloud Functions.
          </p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {format(new Date(report.date), 'MMMM dd, yyyy')}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Generated at {format(new Date(report.generatedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <div>
                      <span className="text-gray-500">Completed: </span>
                      <span className="font-semibold text-green-600">
                        {report.tasksCompletedToday}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pending: </span>
                      <span className="font-semibold text-yellow-600">
                        {report.tasksPending}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Overdue: </span>
                      <span className="font-semibold text-red-600">
                        {report.overdueTasks}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

