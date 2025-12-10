import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, Invoice } from '../types';
import { subscribeToTasks } from '../firebase/firestore';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { Download, PlusCircle } from 'lucide-react';

export const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceType, setInvoiceType] = useState<'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const unsubscribe = subscribeToTasks((allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const getClients = () => {
    const clients = Array.from(new Set(tasks.map((t) => t.clientName)));
    return clients.sort();
  };

  const generateInvoice = () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    let periodStart: Date;
    let periodEnd: Date;

    if (invoiceType === 'daily') {
      periodStart = startOfDay(selectedDate);
      periodEnd = endOfDay(selectedDate);
    } else {
      periodStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      periodEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    }

    // Filter tasks for the selected client and period
    const relevantTasks = tasks.filter((task) => {
      if (task.clientName !== selectedClient) return false;
      const taskDate = new Date(task.completedAt || task.createdAt);
      return taskDate >= periodStart && taskDate <= periodEnd;
    });

    if (relevantTasks.length === 0) {
      alert('No completed tasks found for this client in the selected period');
      return;
    }

    // Calculate invoice amounts
    const invoiceTasks = relevantTasks.map((task) => {
      const hours = task.estimatedDuration;
      const rate = task.netInvoiceAmount / hours || 0;
      return {
        taskId: task.id,
        taskTitle: task.title,
        taskType: task.taskType,
        taskCategory: task.taskCategory,
        hours,
        rate,
        amount: task.netInvoiceAmount,
      };
    });

    const subtotal = invoiceTasks.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.1; // 10% tax (adjust as needed)
    const total = subtotal + tax;

    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: `INV-${format(selectedDate, 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`,
      clientName: selectedClient,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      period: invoiceType,
      periodStart,
      periodEnd,
      tasks: invoiceTasks,
      subtotal,
      tax,
      total,
      status: 'draft',
      createdAt: new Date(),
      createdBy: user!.uid,
    };

    setGeneratedInvoice(invoice);
  };

  const downloadInvoice = () => {
    if (!generatedInvoice) return;

    const invoiceContent = `
INVOICE
Invoice Number: ${generatedInvoice.invoiceNumber}
Client: ${generatedInvoice.clientName}
Invoice Date: ${format(generatedInvoice.invoiceDate, 'MMMM dd, yyyy')}
Due Date: ${format(generatedInvoice.dueDate, 'MMMM dd, yyyy')}
Period: ${generatedInvoice.period === 'daily' ? 'Daily' : 'Weekly'} (${format(generatedInvoice.periodStart, 'MMM dd')} - ${format(generatedInvoice.periodEnd, 'MMM dd, yyyy')})

TASKS:
${generatedInvoice.tasks.map((task, index) => `
${index + 1}. ${task.taskTitle}
   ${task.taskCategory ? `Category: ${task.taskCategory}` : ''}
   ${task.taskType ? `Type: ${task.taskType}` : ''}
   Hours: ${task.hours}
   Rate: $${task.rate.toFixed(2)}/hr
   Amount: $${task.amount.toFixed(2)}
`).join('')}

Subtotal: $${generatedInvoice.subtotal.toFixed(2)}
Tax (10%): $${generatedInvoice.tax.toFixed(2)}
TOTAL: $${generatedInvoice.total.toFixed(2)}

Status: ${generatedInvoice.status.toUpperCase()}
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedInvoice.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (user?.role !== 'admin') {
    return <div className="text-center py-12">Access denied. Admin only.</div>;
  }

  const clients = getClients();

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Invoice</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="invoiceType" className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="invoiceType"
                  value="daily"
                  checked={invoiceType === 'daily'}
                  onChange={(e) => setInvoiceType(e.target.value as 'daily' | 'weekly')}
                  className="mr-2"
                />
                Daily Invoice
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="invoiceType"
                  value="weekly"
                  checked={invoiceType === 'weekly'}
                  onChange={(e) => setInvoiceType(e.target.value as 'daily' | 'weekly')}
                  className="mr-2"
                />
                Weekly Invoice
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-2">
              {invoiceType === 'daily' ? 'Date' : 'Week Of'}
            </label>
            <input
              type="date"
              id="selectedDate"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="selectedClient" className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            <select
              id="selectedClient"
              required
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateInvoice}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Generate Invoice
        </button>
      </div>

      {generatedInvoice && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
              <p className="text-sm text-gray-500 mt-1">Invoice #{generatedInvoice.invoiceNumber}</p>
            </div>
            <button
              onClick={downloadInvoice}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Invoice
            </button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-semibold">{generatedInvoice.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-semibold">{format(generatedInvoice.invoiceDate, 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-semibold">{format(generatedInvoice.dueDate, 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-semibold">
                  {format(generatedInvoice.periodStart, 'MMM dd')} - {format(generatedInvoice.periodEnd, 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tasks</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category/Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedInvoice.tasks.map((task, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {task.taskTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.taskCategory && <div>{task.taskCategory}</div>}
                          {task.taskType && <div className="text-xs">{task.taskType}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.hours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${task.rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${task.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Subtotal:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${generatedInvoice.subtotal.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Tax (10%):
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${generatedInvoice.tax.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        Total:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        ${generatedInvoice.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

