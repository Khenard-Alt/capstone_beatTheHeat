import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAccountCircle, MdNotifications, MdClose, MdCheckCircle, MdWarning, MdInfo } from 'react-icons/md';
import { useNotification } from '../hooks/useNotification';
import { getTimeAgo } from '../utils/helpers';
import '../styles/Header.css';

interface HeaderProps {
  user?: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { notifications, markAsRead, clearAll } = useNotification();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const markAllAsRead = () => {
    notifications
      .filter((notif) => notif.status === 'unread')
      .forEach((notif) => markAsRead(notif.id));
  };

  const unreadCount = notifications.filter((notif) => notif.status === 'unread').length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'heat-alert':
        return <MdWarning className="notif-icon warning" />;
      case 'advisory':
        return <MdWarning className="notif-icon danger" />;
      case 'system':
        return <MdInfo className="notif-icon info" />;
      default:
        return <MdInfo className="notif-icon info" />;
    }
  };

  const homePath = user ? '/dashboard' : '/';

  return (
    <header className="header">
      <div className="header-left">
        <Link to={homePath} className="header-logo">
          <span className="header-logo-icon" style={{ fontSize: '1.8rem' }}>🔥</span>
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
                        {notifications.length > 0 && (
                          <button className="mark-all-read" onClick={clearAll}>
                            <MdClose /> Clear all
                          </button>
                        )}
                        <button
                          className="close-notif-btn"
                          onClick={toggleNotifications}
                          title="Close notifications"
                          aria-label="Close notifications"
                        >
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
                            className={`notification-item ${notif.status === 'unread' ? 'unread' : ''}`}
                            onClick={() => markAsRead(notif.id)}
                          >
                            <div className="notification-item-icon">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="notification-item-content">
                              <div className="notification-item-header">
                                <h4>{notif.title}</h4>
                                {notif.status === 'unread' && <span className="unread-dot"></span>}
                              </div>
                              <p>{notif.message}</p>
                              <span className="notification-time">{getTimeAgo(notif.sentAt)}</span>
                            </div>
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
