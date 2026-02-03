import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Notification, Task } from '../types';
import { getNotifications, markNotificationAsRead, createNotification, subscribeToTasks } from '../firebase/firestore';
import { onMessageListener, requestNotificationPermission } from '../firebase/config';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const refreshNotifications = async () => {
    try {
      if (user) {
        const notifs = await getNotifications(user.uid);
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
        setNotificationsLoaded(true);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  useEffect(() => {
    try {
      if (user) {
        refreshNotifications();
        
        // Request notification permission (non-blocking)
        requestNotificationPermission().catch(err => 
          console.warn('Notification permission error:', err)
        );
        
        // Listen for foreground messages (non-blocking)
        onMessageListener()
          .then((payload: any) => {
            if (payload) {
              refreshNotifications();
              // Show browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(payload.notification?.title || 'New Notification', {
                  body: payload.notification?.body || '',
                  icon: '/vite.svg',
                });
              }
            }
          })
          .catch((err) => console.warn('Error listening to messages:', err));
      }
    } catch (error) {
      console.error('NotificationProvider error:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToTasks(
      (allTasks) => {
        setTasks(allTasks);
      },
      user.role === 'staff' ? user.uid : undefined
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || !notificationsLoaded) return;
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'Completed' && new Date(t.deadline) < now
    );
    const existingOverdue = new Set(
      notifications
        .filter((n) => n.type === 'task_overdue' && n.taskId)
        .map((n) => n.taskId as string)
    );

    if (overdueTasks.length === 0) return;

    const createMissingNotifications = async () => {
      let createdAny = false;
      for (const task of overdueTasks) {
        if (existingOverdue.has(task.id)) continue;
        await createNotification({
          userId: user.uid,
          title: 'Task Overdue',
          message: `Overdue task: ${task.title} (Assigned to ${task.assignedEmployeeName})`,
          type: 'task_overdue',
          taskId: task.id,
          read: false,
        });
        createdAny = true;
      }
      if (createdAny) {
        await refreshNotifications();
      }
    };

    createMissingNotifications().catch((error) =>
      console.error('Error creating overdue notifications:', error)
    );
  }, [user, notificationsLoaded, notifications, tasks]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    await refreshNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead: handleMarkAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
