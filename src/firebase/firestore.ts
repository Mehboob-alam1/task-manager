import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { Task, User, Notification, DailyReport, Invoice } from '../types';

// Check if Firestore is configured
if (!db) {
  console.warn('Firestore is not initialized. Please configure Firebase in src/firebase/config.ts');
}

// Users collection
export const usersCollection = db ? collection(db, 'users') : null as any;

export const getUser = async (uid: string): Promise<User | null> => {
  if (!db) return null;
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      uid: userDoc.id,
      email: data.email || '',
      displayName: data.displayName || '',
      role: data.role || 'staff',
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
  }
  return null;
};

export const getUsers = async (): Promise<User[]> => {
  if (!usersCollection) return [];
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      uid: doc.id,
      email: data.email || '',
      displayName: data.displayName || '',
      role: (data.role || 'staff') as 'admin' | 'staff',
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
  });
};

export const createUser = async (uid: string, userData: Omit<User, 'uid' | 'createdAt'>): Promise<void> => {
  if (!db) throw new Error('Firestore not initialized');
  
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      createdAt: Timestamp.now(),
    });
    console.log('[createUser] User document created with UID:', uid);
  } catch (error: any) {
    console.error('[createUser] Error creating user document:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules. Make sure you have deployed the updated rules.');
    }
    throw error;
  }
};

export const updateUser = async (uid: string, updates: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), updates);
};

// Tasks collection
export const tasksCollection = collection(db, 'tasks');

export const getTask = async (taskId: string): Promise<Task | null> => {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));
  if (taskDoc.exists()) {
    const data = taskDoc.data();
    return {
      id: taskDoc.id,
      ...data,
      deadline: data.deadline?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
    } as Task;
  }
  return null;
};

export const getTasks = async (): Promise<Task[]> => {
  const snapshot = await getDocs(query(tasksCollection, orderBy('createdAt', 'desc')));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      deadline: data.deadline?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
    } as Task;
  });
};

export const getTasksByEmployee = async (employeeId: string): Promise<Task[]> => {
  const q = query(
    tasksCollection,
    where('assignedEmployeeId', '==', employeeId),
    orderBy('deadline', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      deadline: data.deadline?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
    } as Task;
  });
};

export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(tasksCollection, {
    ...taskData,
    deadline: Timestamp.fromDate(taskData.deadline),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  
  if (updates.deadline) {
    updateData.deadline = Timestamp.fromDate(updates.deadline);
  }
  
  if (updates.completedAt) {
    updateData.completedAt = Timestamp.fromDate(updates.completedAt);
  }
  
  // Calculate days taken if task is completed
  if (updates.status === 'Completed' && !updates.completedAt) {
    const task = await getTask(taskId);
    if (task) {
      const daysTaken = Math.ceil(
        (new Date().getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      updateData.daysTaken = daysTaken;
      updateData.completedAt = Timestamp.now();
    }
  }
  
  await updateDoc(doc(db, 'tasks', taskId), updateData);
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteDoc(doc(db, 'tasks', taskId));
};

// Real-time task listeners
export const subscribeToTasks = (
  callback: (tasks: Task[]) => void,
  employeeId?: string
): (() => void) => {
  let q;
  let needsClientSideSort = false;
  
  if (employeeId) {
    // Query without orderBy to avoid index requirement, we'll sort client-side
    q = query(
      tasksCollection,
      where('assignedEmployeeId', '==', employeeId)
    );
    needsClientSideSort = true;
  } else {
    q = query(tasksCollection, orderBy('createdAt', 'desc'));
  }

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const tasks = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          deadline: data.deadline?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        } as Task;
      });
      
      // Sort by deadline client-side if needed
      if (needsClientSideSort) {
        tasks.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
      }
      
      callback(tasks);
    },
    (error) => {
      // Handle errors gracefully
      console.error('Error in subscribeToTasks:', error);
      if (error.code === 'failed-precondition') {
        console.warn('Firestore index missing. Please create the index or the query will work without orderBy.');
      }
      // Return empty array on error to prevent app crash
      callback([]);
    }
  );
};

// Notifications collection
export const notificationsCollection = collection(db, 'notifications');

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Notification;
  });
};

export const createNotification = async (
  notificationData: Omit<Notification, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = await addDoc(notificationsCollection, {
    ...notificationData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

// Daily Reports collection
export const dailyReportsCollection = collection(db, 'dailyReports');

export const getDailyReports = async (): Promise<DailyReport[]> => {
  const q = query(dailyReportsCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      generatedAt: data.generatedAt?.toDate() || new Date(),
    } as DailyReport;
  });
};

// Invoices collection
export const invoicesCollection = collection(db, 'invoices');

export const createInvoice = async (invoice: Omit<Invoice, 'id'>): Promise<string> => {
  if (!invoicesCollection) throw new Error('Firestore not initialized');
  console.log('Creating invoice with createdBy:', invoice.createdBy);
  const invoiceData = {
    ...invoice,
    invoiceDate: Timestamp.fromDate(invoice.invoiceDate),
    dueDate: Timestamp.fromDate(invoice.dueDate),
    periodStart: Timestamp.fromDate(invoice.periodStart),
    periodEnd: Timestamp.fromDate(invoice.periodEnd),
    createdAt: Timestamp.fromDate(invoice.createdAt),
    createdBy: invoice.createdBy, // Ensure createdBy is set
  };
  console.log('Invoice data to save:', invoiceData);
  const docRef = await addDoc(invoicesCollection, invoiceData);
  console.log('Invoice created with ID:', docRef.id);
  return docRef.id;
};

export const getInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  if (!invoicesCollection) throw new Error('Firestore not initialized');
  const docRef = doc(invoicesCollection, invoiceId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    invoiceDate: data.invoiceDate?.toDate() || new Date(),
    dueDate: data.dueDate?.toDate() || new Date(),
    periodStart: data.periodStart?.toDate() || new Date(),
    periodEnd: data.periodEnd?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
  } as Invoice;
};

export const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>): Promise<void> => {
  if (!invoicesCollection) throw new Error('Firestore not initialized');
  const docRef = doc(invoicesCollection, invoiceId);
  await updateDoc(docRef, updates);
};

export const getInvoices = async (userId?: string): Promise<Invoice[]> => {
  if (!invoicesCollection) throw new Error('Firestore not initialized');
  let q;
  if (userId) {
    // Staff can only see their own invoices
    q = query(
      invoicesCollection,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Admin can see all invoices
    q = query(invoicesCollection, orderBy('createdAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      invoiceDate: data.invoiceDate?.toDate() || new Date(),
      dueDate: data.dueDate?.toDate() || new Date(),
      periodStart: data.periodStart?.toDate() || new Date(),
      periodEnd: data.periodEnd?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Invoice;
  });
};

export const subscribeToInvoices = (
  callback: (invoices: Invoice[]) => void,
  userId?: string
): (() => void) => {
  if (!invoicesCollection) {
    console.error('Invoices collection not initialized');
    return () => {};
  }

  let q;
  if (userId) {
    // Staff can only see their own invoices
    // Note: This requires a composite index in Firestore for createdBy + createdAt
    // Firestore will prompt to create it if missing
    try {
      q = query(
        invoicesCollection,
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } catch (error) {
      console.error('Error creating query with orderBy. Trying without orderBy:', error);
      // Fallback: query without orderBy if index is missing
      q = query(
        invoicesCollection,
        where('createdBy', '==', userId)
      );
    }
  } else {
    // Admin can see all invoices
    q = query(invoicesCollection, orderBy('createdAt', 'desc'));
  }

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const invoices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        invoiceDate: data.invoiceDate?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate() || new Date(),
        periodStart: data.periodStart?.toDate() || new Date(),
        periodEnd: data.periodEnd?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Invoice;
    });
    callback(invoices);
  });
};

