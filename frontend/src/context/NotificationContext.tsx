import React, { createContext, useState, ReactNode } from 'react';
import { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'sentAt'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'heat-alert',
    title: 'High Heat Index Alert',
    message: 'Current heat index has reached 38°C. Please take necessary precautions.',
    status: 'unread',
    priority: 'high',
    sentAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
  },
  {
    id: '2',
    userId: '1',
    type: 'advisory',
    title: 'New Health Advisory',
    message: 'A new health advisory has been issued for today.',
    status: 'unread',
    priority: 'medium',
    sentAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: '3',
    userId: '1',
    type: 'info',
    title: 'System Update',
    message: 'Weather data has been successfully updated.',
    status: 'read',
    priority: 'low',
    sentAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    readAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const addNotification = (notification: Omit<Notification, 'id' | 'sentAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      sentAt: new Date().toISOString(),
    };
    setNotifications([newNotification, ...notifications]);
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id
          ? { ...n, status: 'read', readAt: new Date().toISOString() }
          : n
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        clearAll,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
