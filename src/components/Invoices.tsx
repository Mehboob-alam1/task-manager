import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, Invoice, User } from '../types';
import { subscribeToTasks, createInvoice, subscribeToInvoices, getUsers, updateInvoice } from '../firebase/firestore';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Download, PlusCircle, FileText, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceType, setInvoiceType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'create' | 'list'>('create');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const getPeriodLabel = (period: Invoice['period']) => {
    switch (period) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return 'Daily';
    }
  };

  useEffect(() => {
    if (!user) return;

    // Both admin and staff can see all tasks (for invoice generation)
    // Staff will only be able to generate invoices for their assigned tasks
    const unsubscribeTasks = subscribeToTasks((allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });
    
    // When editing invoice, populate form fields
    if (editingInvoice) {
      setSelectedClient(editingInvoice.clientName);
      setInvoiceType(editingInvoice.period);
      setSelectedDate(editingInvoice.invoiceDate);
    }

    // Load users for admin to show staff names
    if (user.role === 'admin') {
      getUsers().then(setUsers).catch(console.error);
    }

    // Subscribe to invoices - staff can only see their own, admin sees all
    const unsubscribeInvoices = subscribeToInvoices((allInvoices) => {
      console.log('Invoices updated:', allInvoices.length, 'invoices for user:', user.uid, 'role:', user.role);
      console.log('Invoice createdBy values:', allInvoices.map(inv => ({ id: inv.id, createdBy: inv.createdBy })));
      setInvoices(allInvoices);
    }, user.role === 'admin' ? undefined : user.uid);

    return () => {
      unsubscribeTasks();
      unsubscribeInvoices();
    };
  }, [user]);

  const getClients = () => {
    // For staff, only show clients for tasks assigned to them
    // For admin, show all clients
    const relevantTasks = (user?.role === 'admin' || user?.role === 'manager')
      ? tasks 
      : tasks.filter(t => t.assignedEmployeeId === user?.uid);
    const clients = Array.from(new Set(relevantTasks.map((t) => t.clientName)));
    return clients.sort();
  };

  const getStaffName = (createdBy: string) => {
    const staffMember = users.find(u => u.uid === createdBy);
    return staffMember?.displayName || 'Unknown';
  };

  const getFilteredInvoices = () => {
    // Admin and manager can see all invoices, staff only their own
    if ((user?.role === 'admin' || user?.role === 'manager') && selectedStaffFilter === 'all') {
      return invoices;
    }
    if ((user?.role === 'admin' || user?.role === 'manager') && selectedStaffFilter !== 'all') {
      return invoices.filter(inv => inv.createdBy === selectedStaffFilter);
    }
    return invoices; // Staff already filtered by subscribeToInvoices
  };

  // Get invoices for current week
  const getCurrentWeekInvoices = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    return getFilteredInvoices().filter((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      return invoiceDate >= weekStart && invoiceDate <= weekEnd;
    });
  };

  const getCurrentMonthInvoices = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return getFilteredInvoices().filter((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      return invoiceDate >= monthStart && invoiceDate <= monthEnd;
    });
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
    } else if (invoiceType === 'weekly') {
      periodStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      periodEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    } else {
      periodStart = startOfMonth(selectedDate);
      periodEnd = endOfMonth(selectedDate);
    }

    // Filter tasks for the selected client and period
    const relevantTasks = tasks.filter((task) => {
      if (task.clientName !== selectedClient) return false;
      // Staff can only invoice their assigned tasks
      if (user?.role === 'staff' && task.assignedEmployeeId !== user.uid) return false;
      const taskDate = new Date(task.completedAt || task.createdAt);
      return taskDate >= periodStart && taskDate <= periodEnd;
    });

    if (relevantTasks.length === 0) {
      alert('No tasks found for this client in the selected period');
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
    const discount = 0; // Default discount, user can edit
    const total = subtotal - discount;

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
      discount,
      total,
      status: 'draft',
      createdAt: new Date(),
      createdBy: user!.uid,
    };

    setGeneratedInvoice(invoice);
  };

  const saveInvoice = async () => {
    if (!generatedInvoice) return;
    
    setSaving(true);
    try {
      if (editingInvoice) {
        // Update existing invoice with all editable fields
        await updateInvoice(editingInvoice.id, {
          clientName: generatedInvoice.clientName,
          invoiceDate: generatedInvoice.invoiceDate,
          dueDate: generatedInvoice.dueDate,
          period: generatedInvoice.period,
          periodStart: generatedInvoice.periodStart,
          periodEnd: generatedInvoice.periodEnd,
          tasks: generatedInvoice.tasks,
          subtotal: generatedInvoice.subtotal,
          discount: generatedInvoice.discount,
          total: generatedInvoice.total,
          status: generatedInvoice.status,
          notes: generatedInvoice.notes,
        });
        setEditingInvoice(null);
      } else {
        // Create new invoice
        await createInvoice(generatedInvoice);
      }
      // Clear and switch to list view
      setGeneratedInvoice(null);
      setEditingInvoice(null);
      setSelectedClient('');
      setViewMode('list');
      // Small delay to ensure the subscription has updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      alert('Failed to save invoice: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadInvoicePDF = async (invoice: Invoice) => {
    const doc = new jsPDF();
    // Start content a bit lower to leave space for logo and header
    let yPos = 50;

    // Load and add logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = '/task_logo.png';
      });
      
      // Add logo (bigger size: 50x50) at top-left corner
      const logoWidth = 50;
      const logoHeight = 50;
      doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight);
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    // Header centered near the top
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 25, { align: 'center' });

    // Invoice Details
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, yPos);
    yPos += 7;
    doc.text(`Client: ${invoice.clientName}`, 20, yPos);
    yPos += 7;
    doc.text(`Invoice Date: ${format(invoice.invoiceDate, 'MMMM dd, yyyy')}`, 20, yPos);
    yPos += 7;
    doc.text(`Due Date: ${format(invoice.dueDate, 'MMMM dd, yyyy')}`, 20, yPos);
    yPos += 7;
    doc.text(`Period: ${getPeriodLabel(invoice.period)}`, 20, yPos);
    yPos += 10;

    // Tasks Table Header
    doc.setFontSize(10);
    doc.text('Task', 20, yPos);
    doc.text('Hours', 100, yPos);
    doc.text('Rate', 130, yPos);
    doc.text('Amount', 160, yPos);
    yPos += 7;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;

    // Tasks
    invoice.tasks.forEach((task) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(task.taskTitle.substring(0, 40), 20, yPos);
      doc.text(task.hours.toString(), 100, yPos);
      doc.text(`$${task.rate.toFixed(2)}`, 130, yPos);
      doc.text(`$${task.amount.toFixed(2)}`, 160, yPos);
      yPos += 7;
    });

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 7;

    // Totals
    doc.setFontSize(11);
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 130, yPos, { align: 'right' });
    yPos += 7;
    doc.text(`Discount: $${invoice.discount.toFixed(2)}`, 130, yPos, { align: 'right' });
    yPos += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${invoice.total.toFixed(2)}`, 130, yPos, { align: 'right' });
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, yPos);

    // Footer - apply to all pages
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        '2024 Omega Tax - Version 1.0 - All right reserrved.',
        105,
        290,
        { align: 'center' }
      );
    }

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const downloadInvoiceExcel = (invoice: Invoice) => {
    const wsData = [
      ['INVOICE'],
      ['Invoice Number', invoice.invoiceNumber],
      ['Client', invoice.clientName],
      ['Invoice Date', format(invoice.invoiceDate, 'MMMM dd, yyyy')],
      ['Due Date', format(invoice.dueDate, 'MMMM dd, yyyy')],
      ['Period', getPeriodLabel(invoice.period)],
      [],
      ['TASKS'],
      ['Task Title', 'Category', 'Type', 'Hours', 'Rate', 'Amount'],
      ...invoice.tasks.map(task => [
        task.taskTitle,
        task.taskCategory || '',
        task.taskType || '',
        task.hours,
        task.rate,
        task.amount
      ]),
      [],
      ['Subtotal', '', '', '', '', invoice.subtotal],
      ['Discount', '', '', '', '', invoice.discount],
      ['TOTAL', '', '', '', '', invoice.total],
      ['Status', invoice.status.toUpperCase()]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    XLSX.writeFile(wb, `${invoice.invoiceNumber}.xlsx`);
  };

  // Group invoices by week
  const groupInvoicesByWeek = (invoices: Invoice[]): Map<string, Invoice[]> => {
    const weekGroups = new Map<string, Invoice[]>();
    
    invoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      const weekStart = startOfWeek(invoiceDate, { weekStartsOn: 0 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(invoice);
    });
    
    return weekGroups;
  };

  const downloadWeeklyInvoicesPDF = async (invoices: Invoice[]) => {
    if (invoices.length === 0) {
      alert('No invoices selected');
      return;
    }

    const weekGroups = groupInvoicesByWeek(invoices);
    const doc = new jsPDF();
    
    // Load logo once
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg!.onload = resolve;
        logoImg!.onerror = reject;
        logoImg!.src = '/task_logo.png';
      });
    } catch (error) {
      console.error('Error loading logo:', error);
    }
    
    weekGroups.forEach((weekInvoices, weekKey) => {
      const weekStart = new Date(weekKey);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      
      // Start content a bit lower to leave space for logo and header
      let yPos = 50;
      let isFirstPage = true;

      // Add logo on first page of each week (top-left corner)
      if (logoImg && isFirstPage) {
        const logoWidth = 40;
        const logoHeight = 40;
        doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight);
      }

      // Week Header centered near the top
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `WEEKLY INVOICES: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`,
        105,
        25,
        { align: 'center' }
      );

      weekInvoices.forEach((invoice, index) => {
        // Check if we need a new page (leave space for at least one invoice)
        if (yPos > 200 && !isFirstPage) {
          doc.addPage();
          yPos = 50;
          // Re-add logo on new page
          if (logoImg) {
            const logoWidth = 40;
            const logoHeight = 40;
            doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight);
          }
          // Re-add week header on new page
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text(
            `WEEKLY INVOICES: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`,
            105,
            25,
            { align: 'center' }
          );
        }
        isFirstPage = false;

        // Invoice separator
        if (index > 0) {
          doc.line(20, yPos, 190, yPos);
          yPos += 10;
        }

        // Invoice Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Invoice #${invoice.invoiceNumber}`, 20, yPos);
        yPos += 8;

        // Invoice Details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Client: ${invoice.clientName}`, 20, yPos);
        doc.text(`Date: ${format(invoice.invoiceDate, 'MMM dd, yyyy')}`, 100, yPos);
        yPos += 6;
        doc.text(`Period: ${getPeriodLabel(invoice.period)}`, 20, yPos);
        doc.text(`Status: ${invoice.status.toUpperCase()}`, 100, yPos);
        yPos += 8;

        // Tasks Table Header
        doc.setFontSize(9);
        doc.text('Task', 20, yPos);
        doc.text('Hours', 100, yPos);
        doc.text('Rate', 130, yPos);
        doc.text('Amount', 160, yPos);
        yPos += 5;
        doc.line(20, yPos, 190, yPos);
        yPos += 5;

        // Tasks (compact)
        invoice.tasks.forEach((task) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
            // Re-add week header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(
              `WEEKLY INVOICES: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`,
              105,
              yPos,
              { align: 'center' }
            );
            yPos += 15;
          }
          doc.setFontSize(9);
          doc.text(task.taskTitle.substring(0, 35), 20, yPos);
          doc.text(task.hours.toString(), 100, yPos);
          doc.text(`$${task.rate.toFixed(2)}`, 130, yPos);
          doc.text(`$${task.amount.toFixed(2)}`, 160, yPos);
          yPos += 5;
        });

        yPos += 3;
        doc.line(20, yPos, 190, yPos);
        yPos += 5;

        // Invoice Totals
        doc.setFontSize(10);
        doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 130, yPos, { align: 'right' });
        yPos += 5;
        doc.text(`Discount: $${invoice.discount.toFixed(2)}`, 130, yPos, { align: 'right' });
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL: $${invoice.total.toFixed(2)}`, 130, yPos, { align: 'right' });
        yPos += 8;
        doc.setFont('helvetica', 'normal');
      });

      // Week Summary
      const weekTotal = weekInvoices.reduce((sum, inv) => sum + inv.total, 0);
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `WEEK TOTAL: $${weekTotal.toFixed(2)}`,
        130,
        yPos,
        { align: 'right' }
      );
      yPos += 15;
    });

    // Footer - apply to all pages
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        '2024 Omega Tax - Version 1.0 - All right reserrved.',
        105,
        290,
        { align: 'center' }
      );
    }

    const fileName = `Weekly_Invoices_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  };

  const groupInvoicesByMonth = (invoices: Invoice[]): Map<string, Invoice[]> => {
    const monthGroups = new Map<string, Invoice[]>();

    invoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.invoiceDate);
      const monthStart = startOfMonth(invoiceDate);
      const monthKey = format(monthStart, 'yyyy-MM');

      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, []);
      }
      monthGroups.get(monthKey)!.push(invoice);
    });

    return monthGroups;
  };

  const downloadMonthlyInvoicesPDF = async (invoices: Invoice[]) => {
    if (invoices.length === 0) {
      alert('No invoices selected');
      return;
    }

    const monthGroups = groupInvoicesByMonth(invoices);
    const doc = new jsPDF();

    // Load logo once
    let logoImg: HTMLImageElement | null = null;
    try {
      logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg!.onload = resolve;
        logoImg!.onerror = reject;
        logoImg!.src = '/task_logo.png';
      });
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    monthGroups.forEach((monthInvoices, monthKey) => {
      const monthStart = new Date(`${monthKey}-01T00:00:00`);

      let yPos = 50;
      let isFirstPage = true;

      if (logoImg && isFirstPage) {
        const logoWidth = 40;
        const logoHeight = 40;
        doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight);
      }

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `MONTHLY INVOICES: ${format(monthStart, 'MMMM yyyy')}`,
        105,
        25,
        { align: 'center' }
      );

      monthInvoices.forEach((invoice, index) => {
        if (yPos > 200 && !isFirstPage) {
          doc.addPage();
          yPos = 50;
          if (logoImg) {
            const logoWidth = 40;
            const logoHeight = 40;
            doc.addImage(logoImg, 'PNG', 15, 10, logoWidth, logoHeight);
          }
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text(
            `MONTHLY INVOICES: ${format(monthStart, 'MMMM yyyy')}`,
            105,
            25,
            { align: 'center' }
          );
        }
        isFirstPage = false;

        if (index > 0) {
          doc.line(20, yPos, 190, yPos);
          yPos += 10;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Invoice #${invoice.invoiceNumber}`, 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Client: ${invoice.clientName}`, 20, yPos);
        doc.text(`Date: ${format(invoice.invoiceDate, 'MMM dd, yyyy')}`, 100, yPos);
        yPos += 6;
        doc.text(`Period: ${getPeriodLabel(invoice.period)}`, 20, yPos);
        doc.text(`Status: ${invoice.status.toUpperCase()}`, 100, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.text('Task', 20, yPos);
        doc.text('Hours', 100, yPos);
        doc.text('Rate', 130, yPos);
        doc.text('Amount', 160, yPos);
        yPos += 5;
        doc.line(20, yPos, 190, yPos);
        yPos += 5;

        invoice.tasks.forEach((task) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(
              `MONTHLY INVOICES: ${format(monthStart, 'MMMM yyyy')}`,
              105,
              yPos,
              { align: 'center' }
            );
            yPos += 15;
          }
          doc.setFontSize(9);
          doc.text(task.taskTitle.substring(0, 35), 20, yPos);
          doc.text(task.hours.toString(), 100, yPos);
          doc.text(`$${task.rate.toFixed(2)}`, 130, yPos);
          doc.text(`$${task.amount.toFixed(2)}`, 160, yPos);
          yPos += 5;
        });

        yPos += 3;
        doc.line(20, yPos, 190, yPos);
        yPos += 5;

        doc.setFontSize(10);
        doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 130, yPos, { align: 'right' });
        yPos += 5;
        doc.text(`Discount: $${invoice.discount.toFixed(2)}`, 130, yPos, { align: 'right' });
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL: $${invoice.total.toFixed(2)}`, 130, yPos, { align: 'right' });
        yPos += 8;
        doc.setFont('helvetica', 'normal');
      });

      const monthTotal = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `MONTH TOTAL: $${monthTotal.toFixed(2)}`,
        130,
        yPos,
        { align: 'right' }
      );
      yPos += 15;
    });

    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        '2024 Omega Tax - Version 1.0 - All right reserrved.',
        105,
        290,
        { align: 'center' }
      );
    }

    const fileName = `Monthly_Invoices_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  };

  const downloadMultipleInvoicesPDF = (invoices: Invoice[]) => {
    // Use weekly grouping by default
    downloadWeeklyInvoicesPDF(invoices);
  };

  const downloadMultipleInvoicesExcel = (invoices: Invoice[]) => {
    const wsData: any[] = [];

    invoices.forEach((invoice, index) => {
      if (index > 0) {
        wsData.push([]);
      }
      wsData.push(
        ['INVOICE'],
        ['Invoice Number', invoice.invoiceNumber],
        ['Client', invoice.clientName],
        ['Invoice Date', format(invoice.invoiceDate, 'MMMM dd, yyyy')],
        ['Due Date', format(invoice.dueDate, 'MMMM dd, yyyy')],
        ['Period', getPeriodLabel(invoice.period)],
        [],
        ['TASKS'],
        ['Task Title', 'Category', 'Type', 'Hours', 'Rate', 'Amount'],
        ...invoice.tasks.map(task => [
          task.taskTitle,
          task.taskCategory || '',
          task.taskType || '',
          task.hours,
          task.rate,
          task.amount
        ]),
        [],
        ['Subtotal', '', '', '', '', invoice.subtotal],
        ['Discount', '', '', '', '', invoice.discount],
        ['TOTAL', '', '', '', '', invoice.total],
        ['Status', invoice.status.toUpperCase()]
      );
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `Invoices_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };


  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const clients = getClients();

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('create')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <PlusCircle className="w-4 h-4 inline mr-2" />
            Create Invoice
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            View Invoices ({invoices.length})
          </button>
        </div>
      </div>

      {viewMode === 'create' ? (
        <>
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
                      onChange={(e) => setInvoiceType(e.target.value as 'daily' | 'weekly' | 'monthly')}
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
                      onChange={(e) => setInvoiceType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="mr-2"
                    />
                    Weekly Invoice
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="invoiceType"
                      value="monthly"
                      checked={invoiceType === 'monthly'}
                      onChange={(e) => setInvoiceType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="mr-2"
                    />
                    Monthly Invoice
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-2">
                  {invoiceType === 'daily' ? 'Date' : invoiceType === 'weekly' ? 'Week Of' : 'Month Of'}
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
                <div className="flex space-x-2">
                  <button
                    onClick={saveInvoice}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Invoice'}
                  </button>
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <>
                      <button
                        onClick={() => downloadInvoicePDF(generatedInvoice)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Download PDF
                      </button>
                      <button
                        onClick={() => downloadInvoiceExcel(generatedInvoice)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Download Excel
                      </button>
                    </>
                  )}
                  {user?.role === 'staff' && (
                    <button
                      onClick={async () => await downloadInvoicePDF(generatedInvoice)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  )}
                </div>
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
                              <input
                                type="text"
                                value={task.taskTitle}
                                onChange={(e) => {
                                  const updatedTasks = [...generatedInvoice.tasks];
                                  updatedTasks[index] = { ...task, taskTitle: e.target.value };
                                  const newSubtotal = updatedTasks.reduce((sum, t) => sum + t.amount, 0);
                                  setGeneratedInvoice({
                                    ...generatedInvoice,
                                    tasks: updatedTasks,
                                    subtotal: newSubtotal,
                                    total: newSubtotal - generatedInvoice.discount
                                  });
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.taskCategory && <div>{task.taskCategory}</div>}
                              {task.taskType && <div className="text-xs">{task.taskType}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={task.hours}
                                onChange={(e) => {
                                  const hours = parseFloat(e.target.value) || 0;
                                  const amount = hours * task.rate;
                                  const updatedTasks = [...generatedInvoice.tasks];
                                  updatedTasks[index] = { ...task, hours, amount };
                                  const newSubtotal = updatedTasks.reduce((sum, t) => sum + t.amount, 0);
                                  setGeneratedInvoice({
                                    ...generatedInvoice,
                                    tasks: updatedTasks,
                                    subtotal: newSubtotal,
                                    total: newSubtotal - generatedInvoice.discount
                                  });
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={task.rate.toFixed(2)}
                                onChange={(e) => {
                                  const rate = parseFloat(e.target.value) || 0;
                                  const amount = task.hours * rate;
                                  const updatedTasks = [...generatedInvoice.tasks];
                                  updatedTasks[index] = { ...task, rate, amount };
                                  const newSubtotal = updatedTasks.reduce((sum, t) => sum + t.amount, 0);
                                  setGeneratedInvoice({
                                    ...generatedInvoice,
                                    tasks: updatedTasks,
                                    subtotal: newSubtotal,
                                    total: newSubtotal - generatedInvoice.discount
                                  });
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={task.amount.toFixed(2)}
                                onChange={(e) => {
                                  const amount = parseFloat(e.target.value) || 0;
                                  const rate = task.hours > 0 ? amount / task.hours : 0;
                                  const updatedTasks = [...generatedInvoice.tasks];
                                  updatedTasks[index] = { ...task, amount, rate };
                                  const newSubtotal = updatedTasks.reduce((sum, t) => sum + t.amount, 0);
                                  setGeneratedInvoice({
                                    ...generatedInvoice,
                                    tasks: updatedTasks,
                                    subtotal: newSubtotal,
                                    total: newSubtotal - generatedInvoice.discount
                                  });
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
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
                            Discount:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={generatedInvoice.discount}
                              onChange={(e) => {
                                const discount = parseFloat(e.target.value) || 0;
                                const newTotal = generatedInvoice.subtotal - discount;
                                setGeneratedInvoice({
                                  ...generatedInvoice,
                                  discount,
                                  total: newTotal,
                                });
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
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
        </>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {user?.role === 'admin' ? 'All Invoices' : 'My Invoices'}
                </h2>
                {getFilteredInvoices().length > 0 && (
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-500">
                      {getFilteredInvoices().length} invoice{getFilteredInvoices().length !== 1 ? 's' : ''} found
                      {user?.role === 'admin' && selectedInvoices.size > 0 && (
                        <span className="ml-2 text-blue-600 font-medium">
                          ({selectedInvoices.size} selected)
                        </span>
                      )}
                    </p>
                    {getCurrentWeekInvoices().length > 0 && (
                      <button
                        onClick={async () => await downloadWeeklyInvoicesPDF(getCurrentWeekInvoices())}
                        className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                        title="Download all invoices for current week"
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Download This Week ({getCurrentWeekInvoices().length})
                      </button>
                    )}
                    {getCurrentMonthInvoices().length > 0 && (
                      <button
                        onClick={async () => await downloadMonthlyInvoicesPDF(getCurrentMonthInvoices())}
                        className="inline-flex items-center px-3 py-1 border border-purple-300 rounded-md text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100"
                        title="Download all invoices for current month"
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Download This Month ({getCurrentMonthInvoices().length})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-3">
                {(user?.role === 'admin' || user?.role === 'manager') && users.length > 0 && (
                  <select
                    value={selectedStaffFilter}
                    onChange={(e) => {
                      setSelectedStaffFilter(e.target.value);
                      setSelectedInvoices(new Set());
                    }}
                    className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Staff Members</option>
                    {users.filter(u => u.role === 'staff').map((staff) => (
                      <option key={staff.uid} value={staff.uid}>
                        {staff.displayName}
                      </option>
                    ))}
                  </select>
                )}
                {(user?.role === 'admin' || user?.role === 'manager') && getFilteredInvoices().length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedInvoices.size > 0 && (
                      <>
                        <button
                          onClick={async () => {
                            const selected = getFilteredInvoices().filter(inv => selectedInvoices.has(inv.id));
                            await downloadMultipleInvoicesPDF(selected);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Download {selectedInvoices.size} PDF
                        </button>
                        <button
                          onClick={() => {
                            const selected = getFilteredInvoices().filter(inv => selectedInvoices.has(inv.id));
                            downloadMultipleInvoicesExcel(selected);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Download {selectedInvoices.size} Excel
                        </button>
                        <button
                          onClick={() => setSelectedInvoices(new Set())}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Clear
                        </button>
                      </>
                    )}
                    {selectedInvoices.size === 0 && (
                      <button
                        onClick={() => {
                          const allIds = new Set(getFilteredInvoices().map(inv => inv.id));
                          setSelectedInvoices(allIds);
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                      >
                        Select All
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {getFilteredInvoices().length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No invoices found</p>
              {(user?.role === 'admin' || user?.role === 'manager') && selectedStaffFilter !== 'all' && (
                <p className="text-sm text-gray-400 mt-2">No invoices for selected staff member</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {getFilteredInvoices().map((invoice) => (
                <li key={invoice.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              Invoice #{invoice.invoiceNumber}
                            </p>
                            {user?.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getStaffName(invoice.createdBy)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Client: {invoice.clientName} • {getPeriodLabel(invoice.period)} Invoice
                          </p>
                          <p className="text-sm text-gray-500">
                            Period: {format(invoice.periodStart, 'MMM dd')} - {format(invoice.periodEnd, 'MMM dd, yyyy')} • 
                            Total: ${invoice.total.toFixed(2)} • Status: {invoice.status}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingInvoice(invoice);
                          setGeneratedInvoice(invoice);
                          setViewMode('create');
                        }}
                        className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <>
                          <button
                            onClick={() => downloadInvoicePDF(invoice)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                            title="Download PDF"
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            PDF
                          </button>
                          <button
                            onClick={() => downloadInvoiceExcel(invoice)}
                            className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                            title="Download Excel"
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            Excel
                          </button>
                        </>
                      )}
                      {user?.role === 'staff' && (
                        <button
                          onClick={() => downloadInvoicePDF(invoice)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
