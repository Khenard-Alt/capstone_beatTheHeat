import React, { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Notification } from '../types';
import { fetchNotifications, markNotificationRead, clearNotifications } from '../services/notifications.service';
import { useAuth } from '../hooks/useAuth';

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

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!user?.id) {
        setNotifications([]);
        return;
      }

      try {
        const data = await fetchNotifications(user.id);
        if (mounted) {
          setNotifications(data);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
        if (mounted) {
          setNotifications([]);
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const addNotification = (notification: Omit<Notification, 'id' | 'sentAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      sentAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    void markNotificationRead(id).catch((error) => {
      console.error('Failed to mark notification as read:', error);
    });

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, status: 'read', readAt: new Date().toISOString() }
          : n
      )
    );
  };

  const clearAll = () => {
    if (user?.id) {
      void clearNotifications(user.id).catch((error) => {
        console.error('Failed to clear notifications:', error);
      });
    }
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
