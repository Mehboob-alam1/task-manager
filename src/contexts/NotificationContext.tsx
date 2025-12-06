import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Notification } from '../types';
import { getNotifications, markNotificationAsRead } from '../firebase/firestore';
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

  const refreshNotifications = async () => {
    try {
      if (user) {
        const notifs = await getNotifications(user.uid);
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
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

