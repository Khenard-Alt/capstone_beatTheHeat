import React, {  useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useNotification } from '../hooks/useNotification';
import { getTimeAgo } from '../utils/helpers';
import { MdNotifications, MdDelete, MdDone, MdDoneAll } from 'react-icons/md';
import '../styles/Notifications.css';

export const Notifications: React.FC = () => {
  const { notifications, markAsRead, clearAll } = useNotification();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

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
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="notification-content">
                  <div className="notification-header">
                    <h4 className="notification-title">{notification.title}</h4>
                    <span className="notification-time">
                      {getTimeAgo(notification.sentAt)}
                    </span>
                  </div>

                  <p className="notification-message">{notification.message}</p>

                  <div className="notification-meta">
                    <span className="notification-type">{notification.type}</span>
                    <span className={`notification-priority ${notification.priority}`}>
                      {notification.priority}
                    </span>
                  </div>
                </div>

                <div className="notification-actions">
                  {notification.status === 'unread' ? (
                    <button
                      className="action-btn"
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
