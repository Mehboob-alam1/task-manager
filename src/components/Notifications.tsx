import React, { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Notifications: React.FC = () => {
  const { notifications, markAsRead, refreshNotifications } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.taskId) {
      navigate(`/tasks/${notification.taskId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return '📋';
      case 'deadline_approaching':
        return '⏰';
      case 'task_overdue':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-50 border-blue-200';
      case 'deadline_approaching':
        return 'bg-yellow-50 border-yellow-200';
      case 'task_overdue':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <Bell className="w-8 h-8 text-gray-700 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        {unreadNotifications.length > 0 && (
          <span className="ml-4 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
            {unreadNotifications.length} unread
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {unreadNotifications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Unread</h2>
              <div className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`bg-white border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                        </div>
                        <p className="mt-2 text-gray-700">{notification.message}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="ml-4 p-2 hover:bg-white rounded-full"
                        title="Mark as read"
                      >
                        <Check className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {readNotifications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Read</h2>
              <div className="space-y-3">
                {readNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow opacity-75"
                  >
                    <div className="flex items-start">
                      <span className="text-2xl mr-2">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-700">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-gray-600">{notification.message}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

