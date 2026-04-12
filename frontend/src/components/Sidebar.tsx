import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdDashboard,
  MdThermostat,
  MdHealthAndSafety,
  MdNotifications,
  MdSchool,
  MdSettings,
  MdPerson,
  MdLogout,
  MdCheckCircle,
} from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import '../styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  userRole?: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, userRole, onLogout }) => {
  const { user } = useAuth();
  const sidebarClasses = ['sidebar', isOpen ? 'sidebar-open' : ''].filter(Boolean).join(' ');

  const menuItems = [
    { path: '/admin', icon: <MdDashboard />, label: 'Admin Dashboard', roles: ['admin'], badge: null },
    { path: '/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['teacher', 'staff'], badge: null },
    { path: '/heat-index', icon: <MdThermostat />, label: 'Heat Index', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/health-advisory', icon: <MdHealthAndSafety />, label: 'Health Advisory', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/notifications', icon: <MdNotifications />, label: 'Notifications', roles: ['admin', 'teacher', 'staff'], badge: 3 },
    { path: '/schools', icon: <MdSchool />, label: 'School Management', roles: ['admin'], badge: null },
    { path: '/profile', icon: <MdPerson />, label: 'Profile', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/settings', icon: <MdSettings />, label: 'Settings', roles: ['admin', 'teacher', 'staff'], badge: null },
  ];

  const filteredItems = menuItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : true
  );

  return (
    <aside className={sidebarClasses}>
      {/* Sidebar Header/Branding */}
      <div className="sidebar-header">
        
      
          <div className="sidebar-brand">
            <h3 className="sidebar-brand-title">Beat The Heat</h3>
            <p className="sidebar-brand-subtitle">MAYAMOT ELEMENTARY</p>
          </div>
        </div>
      
      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-menu-label">Menu</div>
        <ul className="sidebar-menu">
          {filteredItems.map((item) => (
            <li key={item.path} className="sidebar-menu-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                end={item.path === '/'}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-system-status">
          <div className="system-status-indicator">
            <MdCheckCircle className="status-icon" />
            <span className="status-text">System Online</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>

        {onLogout && (
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <MdLogout className="logout-icon" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
};
