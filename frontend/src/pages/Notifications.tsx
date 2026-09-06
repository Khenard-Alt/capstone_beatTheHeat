import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useNotification } from '../hooks/useNotification';
import { getTimeAgo } from '../utils/helpers';
import { formatScheduledTime } from '../utils/formatters';
import { MdNotifications, MdDelete, MdDone, MdDoneAll } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import '../styles/Notifications.css';

export const Notifications: React.FC = () => {
  const { notifications, markAsRead, clearAll } = useNotification();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const navigate = useNavigate();

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return n.status === 'unread';
    if (filter === 'read') return n.status === 'read';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'heat-alert': '🌡️',
      advisory: '⚠️',
      system: '⚙️',
      info: 'ℹ️',
    };
    return icons[type] || '🔔';
  };

  const safeTimeLabel = (date: string | Date) => {
    try {
      return getTimeAgo(date);
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getPriorityClass = (priority: string) => {
    return `notification-priority-${priority}`;
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1>
            <MdNotifications /> Notifications
          </h1>
          <p>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="header-actions">
          {notifications.length > 0 && (
            <Button variant="outline" onClick={clearAll}>
              <MdDelete /> Clear All
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="notifications-filter">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="notifications-empty">
              <MdNotifications size={64} />
              <h3>No notifications</h3>
              <p>
                {filter === 'unread'
                  ? 'No unread notifications'
                  : filter === 'read'
                  ? 'No read notifications'
                  : 'You have no notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.status === 'unread' ? 'notification-item-unread' : ''} ${getPriorityClass(notification.priority)}`}
              >
                <div className="notification-icon">{getNotificationIcon(notification.type)}</div>

                <div className="notification-body">
                  <div className="notification-header">
                    <strong>{notification.title.replace(/Scheduled Advisory - (\d{2}:\d{2})/, (_m, t) => `Scheduled Advisory - ${formatScheduledTime(t)}`)}</strong>
                    <small className="notification-time">{safeTimeLabel(notification.sentAt)}</small>
                  </div>
                  <div className="notification-message">{notification.message}</div>
                </div>

                <div className="notification-actions">
                  <button
                    className="action-view-small"
                    onClick={() => {
                      if (notification.status === 'unread') markAsRead(notification.id);
                      if (notification.type === 'advisory') navigate('/health-advisory');
                      else if (notification.type === 'heat-alert') navigate('/heat-index');
                      else navigate('/notifications');
                    }}
                    title="View"
                  >
                    View
                  </button>

                  {notification.status === 'unread' ? (
                    <button
                      className="action-mark-read"
                      onClick={() => markAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <MdDone />
                    </button>
                  ) : (
                    <span className="read-indicator" title="Read">
                      <MdDoneAll />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
