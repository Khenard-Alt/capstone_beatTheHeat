import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MdDashboard,
  MdForum,
  MdCampaign,
  MdAutoAwesome,
  MdChat,
  MdPerson,
  MdSettings,
  MdThermostat,
  MdHealthAndSafety,
  MdNotifications,
  MdSchool,
  MdLogout,
  MdCheckCircle,
} from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  userRole?: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, userRole, onLogout }) => {
  const { user } = useAuth();
  const sidebarClasses = ['sidebar', isOpen ? 'sidebar-open' : ''].filter(Boolean).join(' ');

  const parentMenuItems = [
    { path: '/parent/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['parent'], badge: null },
    { path: '/parent/questions-concerns', icon: <MdForum />, label: 'Questions and Concerns', roles: ['parent'], badge: 4 },
    { path: '/parent/announcements', icon: <MdCampaign />, label: 'Announcements', roles: ['parent'], badge: 2 },
    { path: '/parent/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['parent'], badge: null },
    { path: '/parent/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['parent'], badge: null },
  ];

  const principalMenuItems = [
    { path: '/principal/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['principal'], badge: null },
    { path: '/principal/reports', icon: <MdCampaign />, label: 'Overall Reports', roles: ['principal'], badge: null },
    { path: '/principal/announcements', icon: <MdCampaign />, label: 'Announcements', roles: ['principal'], badge: null },
    { path: '/principal/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['principal'], badge: null },
    { path: '/principal/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['principal'], badge: null },
  ];

  const headTeacherMenuItems = [
    { path: '/head-teacher/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['head-teacher'], badge: null },
    { path: '/head-teacher/incident-review', icon: <MdHealthAndSafety />, label: 'Incident Review', roles: ['head-teacher'], badge: 3 },
    { path: '/head-teacher/incident-reports', icon: <MdCampaign />, label: 'Incident Reports', roles: ['head-teacher'], badge: null },
    { path: '/head-teacher/advisories', icon: <MdAutoAwesome />, label: 'Heat Data & Advisories', roles: ['head-teacher'], badge: null },
    { path: '/head-teacher/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['head-teacher'], badge: null },
    { path: '/head-teacher/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['head-teacher'], badge: null },
  ];

  const teacherMenuItems = [
    { path: '/teacher/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['teacher'], badge: null },
    { path: '/teacher/conduct-form', icon: <MdForum />, label: 'Conduct Form', roles: ['teacher'], badge: null },
    { path: '/teacher/incident-reports', icon: <MdCampaign />, label: 'Incident Reports', roles: ['teacher'], badge: null },
    { path: '/teacher/advisories', icon: <MdAutoAwesome />, label: 'Heat Data & Advisories', roles: ['teacher'], badge: null },
    { path: '/teacher/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['teacher'], badge: null },
    { path: '/teacher/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['teacher'], badge: null },
  ];

  const defaultMenuItems = [
    { path: '/admin', icon: <MdDashboard />, label: 'Admin Dashboard', roles: ['admin'], badge: null },
    { path: '/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['teacher', 'staff'], badge: null },
    { path: '/heat-index', icon: <MdThermostat />, label: 'Heat Index', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/health-advisory', icon: <MdHealthAndSafety />, label: 'Health Advisory', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/notifications', icon: <MdNotifications />, label: 'Notifications', roles: ['admin', 'teacher', 'staff'], badge: 3 },
    { path: '/schools', icon: <MdSchool />, label: 'School Management', roles: ['admin'], badge: null },
    { path: '/profile', icon: <MdPerson />, label: 'Profile', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/settings', icon: <MdSettings />, label: 'Settings', roles: ['admin', 'teacher', 'staff'], badge: null },
  ];

  const getMenuItems = () => {
    if (userRole === 'parent') {
      return parentMenuItems;
    } else if (userRole === 'principal') {
      return principalMenuItems;
    } else if (userRole === 'head-teacher') {
      return headTeacherMenuItems;
    } else if (userRole === 'teacher') {
      return teacherMenuItems;
    }
    return defaultMenuItems;
  };

  const menuItems = getMenuItems();

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
