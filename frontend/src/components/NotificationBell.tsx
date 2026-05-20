import React, { useState } from 'react';
import { MdNotifications } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types';
import { getTimeAgo } from '../utils/helpers';
import { formatScheduledTime } from '../utils/formatters';
import '../styles/NotificationBell.css';

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const navigate = useNavigate();
  const handleView = (notification: Notification) => {
    if (notification.status === 'unread' && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // simple routing rules by notification type
    if (notification.type === 'advisory') navigate('/health-advisory');
    else if (notification.type === 'heat-alert') navigate('/heat-index');
    else navigate('/notifications');
    setIsOpen(false);
  };

  const safeTimeLabel = (date: string | Date) => {
    try {
      return getTimeAgo(date);
    } catch (err) {
      return 'Invalid date';
    }
  };

  return (
    <div className="notification-bell">
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MdNotifications />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && onClearAll && (
              <button
                className="notification-clear-btn"
                onClick={onClearAll}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.status === 'unread' ? 'notification-unread' : ''}`}
                >
                  <div className="notification-content">
                    <h4 className="notification-title">
                      {notification.title.replace(/Scheduled Advisory - (\d{2}:\d{2})/, (_m, t) => `Scheduled Advisory - ${formatScheduledTime(t)}`)}
                    </h4>
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    <span className="notification-time">
                      {safeTimeLabel(notification.sentAt)}
                    </span>
                  </div>
                  {notification.status === 'unread' && (
                    <span className="notification-dot"></span>
                  )}
                  <div className="notification-actions-inline">
                    <button
                      className="action-view"
                      onClick={() => handleView(notification)}
                      title="View"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
