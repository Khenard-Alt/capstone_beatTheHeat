import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdNotifications, MdAccountCircle, MdClose, MdCheckCircle, MdWarning, MdInfo } from 'react-icons/md';
import '../styles/Header.css';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  time: string;
  read: boolean;
}

interface HeaderProps {
  user?: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'High Heat Index Alert',
      message: 'Heat index reached 35°C at Main Building. Exercise caution.',
      type: 'warning',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 2,
      title: 'System Update',
      message: 'New AI prediction model has been deployed successfully.',
      type: 'info',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      title: 'Health Advisory',
      message: 'Students advised to stay hydrated. Water stations checked.',
      type: 'danger',
      time: '2 hours ago',
      read: true
    },
    {
      id: 4,
      title: 'Weather Update',
      message: 'Temperature expected to rise in the afternoon. Monitor closely.',
      type: 'info',
      time: '3 hours ago',
      read: true
    }
  ]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <MdWarning className="notif-icon warning" />;
      case 'danger':
        return <MdWarning className="notif-icon danger" />;
      case 'info':
      default:
        return <MdInfo className="notif-icon info" />;
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="header-logo">
          <div className="header-logo-placeholder">
            <span className="header-logo-icon">☀️</span>
          </div>
          <div className="header-logo-content">
            <span className="header-logo-text">Beat The Heat</span>
            <span className="header-logo-subtitle">Mayamot Elementary School</span>
          </div>
        </Link>
      </div>

      <div className="header-right">
        {user && (
          <>
            <div className="notification-container">
              <button
                className="header-notification-btn"
                onClick={toggleNotifications}
              >
                <MdNotifications />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="notification-overlay" onClick={toggleNotifications}></div>
                  <div className="notification-modal">
                    <div className="notification-header">
                      <div className="notification-header-content">
                        <h3>Notifications</h3>
                        <span className="notification-count">{unreadCount} unread</span>
                      </div>
                      <div className="notification-header-actions">
                        {unreadCount > 0 && (
                          <button className="mark-all-read" onClick={markAllAsRead}>
                            <MdCheckCircle /> Mark all as read
                          </button>
                        )}
                        <button className="close-notif-btn" onClick={toggleNotifications}>
                          <MdClose />
                        </button>
                      </div>
                    </div>

                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <div className="no-notifications">
                          <MdCheckCircle className="no-notif-icon" />
                          <p>No notifications</p>
                          <span>You're all caught up!</span>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`notification-item ${!notif.read ? 'unread' : ''}`}
                            onClick={() => markAsRead(notif.id)}
                          >
                            <div className="notification-item-icon">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="notification-item-content">
                              <div className="notification-item-header">
                                <h4>{notif.title}</h4>
                                {!notif.read && <span className="unread-dot"></span>}
                              </div>
                              <p>{notif.message}</p>
                              <span className="notification-time">{notif.time}</span>
                            </div>
                            <button
                              className="delete-notif-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                            >
                              <MdClose />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="notification-footer">
                      <Link to="/notifications" onClick={toggleNotifications}>
                        View all notifications
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link to="/profile" className="header-profile">
              <MdAccountCircle className="header-profile-icon" />
              <div className="header-profile-info">
                <span className="header-profile-name">
                  {user.firstName} {user.lastName}
                </span>
                <span className="header-profile-role">{user.role}</span>
              </div>
            </Link>
          </>
        )}
        {!user && (
          <Link to="/login" className="header-login-btn">
            Login
          </Link>
        )}
      </div>
    </header>
  );
};
