import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  MdWifiOff,
  MdSchool,
  MdLogout,
  MdCheckCircle,
  MdKeyboardArrowDown,
  MdHistory,
  MdVerifiedUser,
} from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../Avatar';
import { apiClient } from '../../services/api';
import { fetchNotifications } from '../../services/notifications.service';
import schoolLogo from '../../assets/mayamotlogo.png';
import '../../styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  userRole?: string;
  onLogout?: () => void;
  onNavigate?: () => void;
}

interface SidebarSectionLink {
  path: string;
  label: string;
  icon: React.ReactNode;
  sectionId?: string;
}

interface NetworkConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

const getNetworkConnection = (): NetworkConnectionInfo | undefined => {
  const nav = navigator as Navigator & {
    connection?: NetworkConnectionInfo;
    mozConnection?: NetworkConnectionInfo;
    webkitConnection?: NetworkConnectionInfo;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection;
};

interface SidebarMenuItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
  badge: number | null;
  menuKey?: string;
  children?: SidebarSectionLink[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, userRole, onLogout, onNavigate }) => {
  const { user } = useAuth();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow'>('online');
  const [showNetworkStatus, setShowNetworkStatus] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number | null>(null);
  const [pendingIncidentCount, setPendingIncidentCount] = useState<number | null>(null);
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const networkStatusRef = useRef<'online' | 'offline' | 'slow'>('online');
  const statusHideTimerRef = useRef<number | null>(null);
  const sidebarClasses = ['sidebar', isOpen ? 'sidebar-open' : ''].filter(Boolean).join(' ');

  const parentMenuItems: SidebarMenuItem[] = [
    { path: '/parent/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['parent'], badge: null },
    {
      path: '/parent/questions-concerns',
      icon: <MdForum />,
      label: "teacher's panel",
      roles: ['parent'],
      // No unread-tracking exists for parent/teacher messages yet, so this
      // stays null instead of showing a fabricated count.
      badge: null,
      menuKey: 'questions-concerns',
      children: [
        { path: '/parent/questions-concerns', label: "Questions & Concerns", icon: <MdForum />, sectionId: 'question-and-concern-top' },
        { path: '/parent/questions-concerns', label: 'Adviser Messages', icon: <MdChat />, sectionId: 'adviser-messages' },
      ],
    },
    {
      path: '/parent/announcements',
      icon: <MdCampaign />,
      label: 'Announcement',
      roles: ['parent'],
      // No unread-tracking exists for announcements yet, so this stays null
      // instead of showing a fabricated count.
      badge: null,
      menuKey: 'announcements',
      children: [
        { path: '/parent/announcements', label: 'Announcement', icon: <MdCampaign />, sectionId: 'announcements-top' },
        { path: '/parent/announcements', label: 'Principal Announcements', icon: <MdCampaign />, sectionId: 'principal-announcements' },
        { path: '/parent/announcements', label: 'Active Advisories', icon: <MdAutoAwesome />, sectionId: 'active-advisories' },
      ],
    },
    { path: '/parent/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['parent'], badge: null },
    { path: '/parent/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['parent'], badge: null },
  ];

  const principalMenuItems: SidebarMenuItem[] = [
    { path: '/principal/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['principal'], badge: null },
    { path: '/principal/reports', icon: <MdCampaign />, label: 'Overall Reports', roles: ['principal'], badge: null },
    { path: '/principal/announcements', icon: <MdCampaign />, label: 'Announcements', roles: ['principal'], badge: null },
    { path: '/principal/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['principal'], badge: null },
    { path: '/principal/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['principal'], badge: null },
  ];

  const headTeacherMenuItems: SidebarMenuItem[] = [
    { path: '/head-teacher/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['head-teacher'], badge: null },
    {
      path: '/head-teacher/incident-review',
      icon: <MdHealthAndSafety />,
      label: 'Incident Review',
      roles: ['head-teacher'],
      badge: pendingIncidentCount,
      menuKey: 'incident-review',
      children: [
        { path: '/head-teacher/incident-review', label: 'Review Queue', icon: <MdHealthAndSafety />, sectionId: 'incident-review-top' },
        { path: '/head-teacher/incident-history', label: 'Incident History', icon: <MdHistory />, sectionId: 'incident-history-top' },
      ],
    },
    {
      path: '/head-teacher/advisories',
      icon: <MdCampaign />,
      label: 'Announcements',
      roles: ['head-teacher'],
      badge: null,
      menuKey: 'announcements',
      children: [
        { path: '/head-teacher/advisories', label: 'Advisories', icon: <MdAutoAwesome />, sectionId: 'advisories-top' },
        { path: '/head-teacher/announcements/principal', label: 'Announcements', icon: <MdCampaign />, sectionId: 'principal-announcements' },
        { path: '/head-teacher/advisories', label: 'Heat Data', icon: <MdThermostat />, sectionId: 'heat-data-top' },
      ],
    },
    { path: '/head-teacher/parent-verifications', icon: <MdVerifiedUser />, label: 'Parent Verifications', roles: ['head-teacher'], badge: null },
    { path: '/head-teacher/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['head-teacher'], badge: null },
    { path: '/head-teacher/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['head-teacher'], badge: null },
  ];

    const teacherMenuItems: SidebarMenuItem[] = [
      { path: '/teacher/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['teacher'], badge: null },
      {
        path: '/teacher/messages',
        icon: <MdForum />,
        label: "Parent's Panel",
        roles: ['teacher'],
        badge: null,
        menuKey: 'questions-concerns',
        children: [
          { path: '/teacher/messages', label: 'Inbox', icon: <MdChat />, sectionId: 'teacher-messages-top' },
          { path: '/teacher/messages', label: 'Compose Reply', icon: <MdForum />, sectionId: 'teacher-message-compose' },
        ],
      },
      { path: '/teacher/incident-reports', icon: <MdCampaign />, label: 'Incident Reports', roles: ['teacher'], badge: null },
      { path: '/teacher/staff-messages', icon: <MdForum />, label: 'Staff Messages', roles: ['teacher'], badge: null },
      {
        path: '/teacher/advisories',
        icon: <MdCampaign />,
        label: 'Advisories',
        roles: ['teacher'],
        badge: null,
        menuKey: 'announcements',
        children: [
          { path: '/teacher/advisories', label: 'Heat Data & Advisories', icon: <MdAutoAwesome />, sectionId: 'advisories-top' },
          { path: '/teacher/advisories', label: 'Principal Announcements', icon: <MdCampaign />, sectionId: 'principal-announcements' },
        ],
      },
      { path: '/teacher/chatbot', icon: <MdChat />, label: 'Chatbot', roles: ['teacher'], badge: null },
      { path: '/teacher/profile-settings', icon: <MdPerson />, label: 'Profile / Settings', roles: ['teacher'], badge: null },
    ];

  const defaultMenuItems: SidebarMenuItem[] = [
    { path: '/admin', icon: <MdDashboard />, label: 'Admin Dashboard', roles: ['admin'], badge: null },
    { path: '/dashboard', icon: <MdDashboard />, label: 'Dashboard', roles: ['teacher', 'staff'], badge: null },
    { path: '/heat-index', icon: <MdThermostat />, label: 'Heat Index', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/health-advisory', icon: <MdHealthAndSafety />, label: 'Health Advisory', roles: ['admin', 'teacher', 'staff'], badge: null },
    { path: '/notifications', icon: <MdNotifications />, label: 'Notifications', roles: ['admin', 'teacher', 'staff'], badge: unreadNotificationCount },
    { path: '/schools', icon: <MdSchool />, label: 'School Management', roles: ['admin'], badge: null },
    { path: '/admin/parent-verifications', icon: <MdVerifiedUser />, label: 'Parent Verifications', roles: ['admin'], badge: null },
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

  const profilePath = userRole === 'parent'
    ? '/parent/profile-settings'
    : userRole === 'principal'
    ? '/principal/profile-settings'
    : userRole === 'head-teacher'
    ? '/head-teacher/profile-settings'
    : userRole === 'teacher'
    ? '/teacher/profile-settings'
    : '/profile';

  const isParentQuestionsConcernsActive =
    userRole === 'parent' && location.pathname.startsWith('/parent/questions-concerns');
  const isParentAnnouncementsActive =
    userRole === 'parent' && location.pathname.startsWith('/parent/announcements');
  const isHeadTeacherIncidentReviewActive =
    userRole === 'head-teacher' && location.pathname.startsWith('/head-teacher/incident-review');
  const isHeadTeacherIncidentReportsActive =
    userRole === 'head-teacher' && location.pathname.startsWith('/head-teacher/incident-reports');
  const isHeadTeacherIncidentHistoryActive =
    userRole === 'head-teacher' && location.pathname.startsWith('/head-teacher/incident-history');
  const isHeadTeacherAnnouncementsActive =
    userRole === 'head-teacher' && (
      location.pathname.startsWith('/head-teacher/advisories') ||
      location.pathname.startsWith('/head-teacher/announcements')
    );
  const isTeacherQuestionsConcernsActive =
    userRole === 'teacher' && location.pathname.startsWith('/teacher/messages');

  const isTeacherAnnouncementsActive =
    userRole === 'teacher' && (
      location.pathname.startsWith('/teacher/advisories') ||
      location.pathname.startsWith('/teacher/announcements')
    );

  useEffect(() => {
    if (isParentQuestionsConcernsActive) {
      setOpenMenu('questions-concerns');
      return;
    }

    if (isParentAnnouncementsActive) {
      setOpenMenu('announcements');
      return;
    }

    if (isHeadTeacherIncidentReviewActive || isHeadTeacherIncidentReportsActive || isHeadTeacherIncidentHistoryActive) {
      setOpenMenu('incident-review');
      return;
    }

    if (isHeadTeacherAnnouncementsActive) {
      setOpenMenu('announcements');
      return;
    }

    if (isTeacherQuestionsConcernsActive) {
      setOpenMenu('questions-concerns');
      return;
    }

    if (isTeacherAnnouncementsActive) {
      setOpenMenu('announcements');
      return;
    }

    setOpenMenu(null);
  }, [
    isParentAnnouncementsActive,
    isParentQuestionsConcernsActive,
    isHeadTeacherIncidentReviewActive,
    isHeadTeacherIncidentReportsActive,
    isHeadTeacherIncidentHistoryActive,
    isHeadTeacherAnnouncementsActive,
    isTeacherAnnouncementsActive,
    isTeacherQuestionsConcernsActive,
  ]);

  const setStatusVisibility = (visible: boolean) => {
    setShowNetworkStatus(visible);
  };

  const updateNetworkStatus = async () => {
    try {
      if (!navigator.onLine) {
        networkStatusRef.current = 'offline';
        setNetworkStatus('offline');
        setStatusVisibility(true);
        if (statusHideTimerRef.current) {
          window.clearTimeout(statusHideTimerRef.current);
          statusHideTimerRef.current = null;
        }
        return;
      }

      const conn = getNetworkConnection();
      const effective = String(conn?.effectiveType ?? '').toLowerCase();
      const downlink = Number(conn?.downlink ?? 10);
      const rtt = Number(conn?.rtt ?? 0);

      if (effective.includes('2g') || effective.includes('slow-2g') || downlink < 1.5 || (rtt > 0 && rtt >= 800)) {
        networkStatusRef.current = 'slow';
        setNetworkStatus('slow');
        setStatusVisibility(true);
        if (statusHideTimerRef.current) {
          window.clearTimeout(statusHideTimerRef.current);
          statusHideTimerRef.current = null;
        }
        return;
      }

      // Reuse apiClient's own resolved base URL (which already handles dev
      // tunnels / prod / localhost) instead of hardcoding localhost — a
      // hardcoded localhost is unreachable from a devtunnel-forwarded device
      // and was making this health check falsely report "offline".
      const healthUrl = `${apiClient.defaults.baseURL ?? 'http://localhost:5000'}/health`;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 1400);
      const startedAt = performance.now();

      try {
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const elapsed = performance.now() - startedAt;
        window.clearTimeout(timeoutId);

        if (!response.ok || elapsed >= 1000) {
          networkStatusRef.current = 'slow';
          setNetworkStatus('slow');
          setStatusVisibility(true);
          if (statusHideTimerRef.current) {
            window.clearTimeout(statusHideTimerRef.current);
            statusHideTimerRef.current = null;
          }
          return;
        }

        const wasNotOnline = networkStatusRef.current !== 'online';
        networkStatusRef.current = 'online';
        setNetworkStatus('online');
        if (wasNotOnline) {
          setStatusVisibility(true);
          if (statusHideTimerRef.current) {
            window.clearTimeout(statusHideTimerRef.current);
          }
          statusHideTimerRef.current = window.setTimeout(() => {
            setStatusVisibility(false);
            statusHideTimerRef.current = null;
          }, 2000);
        } else {
          setStatusVisibility(false);
        }
      } catch (error) {
        window.clearTimeout(timeoutId);
        if ((error as Error)?.name === 'AbortError') {
          networkStatusRef.current = 'slow';
          setNetworkStatus('slow');
        } else {
          networkStatusRef.current = 'offline';
          setNetworkStatus('offline');
        }
        setStatusVisibility(true);
        if (statusHideTimerRef.current) {
          window.clearTimeout(statusHideTimerRef.current);
          statusHideTimerRef.current = null;
        }
      }
    } catch {
      networkStatusRef.current = 'online';
      setNetworkStatus('online');
      setStatusVisibility(false);
    }
  };

  useEffect(() => {
    networkStatusRef.current = networkStatus;
  }, [networkStatus]);

  // network status: online / slow / offline
  useEffect(() => {
    void updateNetworkStatus();
    const scheduleUpdate = () => { void updateNetworkStatus(); };
    window.addEventListener('online', scheduleUpdate);
    window.addEventListener('offline', scheduleUpdate);
    const conn = getNetworkConnection();
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', scheduleUpdate);
    }

    const pollId = window.setInterval(() => {
      void updateNetworkStatus();
    }, 6000);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('online', scheduleUpdate);
      window.removeEventListener('offline', scheduleUpdate);
      if (conn && conn.removeEventListener) conn.removeEventListener('change', scheduleUpdate);
      if (statusHideTimerRef.current) {
        window.clearTimeout(statusHideTimerRef.current);
        statusHideTimerRef.current = null;
      }
    };
  }, []);

  // Real sidebar badge counts. Notifications and pending incidents both have
  // genuine status fields to count from; other badges (parent messages,
  // announcements) have no unread-tracking in the schema, so they stay null
  // (no badge) rather than show a fabricated number.
  useEffect(() => {
    if (!user?.id) return;
    const role = userRole ?? user.role;
    const wantsNotificationBadge = ['admin', 'teacher', 'staff'].includes(role as string);
    const wantsIncidentBadge = role === 'head-teacher';
    if (!wantsNotificationBadge && !wantsIncidentBadge) return;

    let cancelled = false;

    const loadCounts = async () => {
      if (wantsNotificationBadge) {
        try {
          const notifications = await fetchNotifications(user.id, 100, 0);
          if (!cancelled) {
            setUnreadNotificationCount(notifications.filter((n) => n.status === 'unread').length);
          }
        } catch {
          // leave the previous count in place; a transient fetch failure
          // shouldn't flash the badge away
        }
      }

      if (wantsIncidentBadge) {
        try {
          const { data } = await apiClient.get('/api/incidents', { params: { limit: 100, offset: 0 } });
          const incidents: Array<{ status?: string }> = data?.data ?? [];
          if (!cancelled) {
            setPendingIncidentCount(incidents.filter((i) => i.status === 'pending').length);
          }
        } catch {
          // same as above — keep the last known count on a transient error
        }
      }
    };

    void loadCounts();
    const pollId = window.setInterval(() => void loadCounts(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [user?.id, user?.role, userRole]);

  const openMenuPanel = (menuKey: string) => {
    setOpenMenu((current) => (current === menuKey ? null : menuKey));
  };

  const navigate = useNavigate();

  const scrollToSection = (routePath: string, sectionId: string) => {
    const doScroll = () => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const headerEl = document.querySelector('.header') as HTMLElement | null;
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
      const targetY = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12; // small offset

      window.history.replaceState(null, '', `${routePath}#${sectionId}`);
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    };

    if (location.pathname !== routePath) {
      // navigate first, then scroll after route renders
      navigate(routePath);
      setTimeout(doScroll, 250);
    } else {
      doScroll();
    }
  };

  return (
    <aside className={sidebarClasses}>
      {/* Sidebar Header/Branding */}
      <div className="sidebar-header">
          <div className="sidebar-branding">
            <img className="sidebar-logo-image" src={schoolLogo} alt="Mayamot Elementary School logo" />
            <div className="sidebar-brand">
            <h3 className="sidebar-brand-title">Beat The Heat</h3>
            <p className="sidebar-brand-subtitle">MAYAMOT ELEMENTARY</p>
            </div>
          </div>
        </div>
      
      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-menu-label">Menu</div>
        <ul className="sidebar-menu">
          {filteredItems.map((item) => (
            <li key={item.path} className={`sidebar-menu-item ${item.children?.length ? 'sidebar-menu-item--has-children' : ''} ${item.menuKey && openMenu === item.menuKey ? 'sidebar-menu-item--expanded' : ''}`}>
              {item.children?.length ? (
                <>
                  <NavLink
                    to={item.path}
                    className={`sidebar-link sidebar-link-button ${item.menuKey && openMenu === item.menuKey ? 'sidebar-link-active' : ''}`}
                    onClick={() => item.menuKey && openMenuPanel(item.menuKey)}
                    aria-expanded={item.menuKey ? openMenu === item.menuKey : false}
                    aria-controls={item.menuKey ? `sidebar-submenu-${item.menuKey}` : undefined}
                    end
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                    <span className={`sidebar-accordion-icon ${item.menuKey && openMenu === item.menuKey ? 'is-open' : ''}`}>
                      <MdKeyboardArrowDown />
                    </span>
                  </NavLink>

                    {item.menuKey && openMenu === item.menuKey && (
                      <ul className="sidebar-submenu" id={`sidebar-submenu-${item.menuKey}`}>
                        {item.children.map((child) => (
                          <li key={`${item.menuKey}-${child.sectionId || child.label}`} className="sidebar-submenu-item">
                            <NavLink
                              to={child.path}
                              className={({ isActive }) =>
                                `sidebar-submenu-link ${isActive ? 'sidebar-submenu-link-active' : ''}`
                              }
                              end
                                onClick={(e) => {
                                  if (child.sectionId) {
                                    e.preventDefault();
                                    scrollToSection(child.path, child.sectionId!);
                                  } else {
                                    // allow navigation, then scroll to top of the new page
                                    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                                  }
                                  onNavigate?.();
                                }}
                            >
                              <span className="sidebar-submenu-icon">{child.icon}</span>
                              <span className="sidebar-submenu-label">{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                    }
                    end={item.path === '/'}
                    onClick={() => {
                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                      onNavigate?.();
                    }}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                  </NavLink>
                )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {/* show only when connection is slow/offline; hide when online */}
        <div className={`sidebar-system-status ${networkStatus} ${showNetworkStatus ? '' : 'hidden'}`} aria-live="polite" aria-hidden={!showNetworkStatus}>
          <div className={`system-status-indicator ${networkStatus}`}>
            {networkStatus === 'online' && <MdCheckCircle className="status-icon" />}
            {networkStatus === 'slow' && <MdNotifications className="status-icon slow" />}
            {networkStatus === 'offline' && <MdWifiOff className="status-icon offline" />}
            <span className="status-text">
              {networkStatus === 'online' && 'System Online'}
              {networkStatus === 'slow' && 'Poor Connection'}
              {networkStatus === 'offline' && 'No Internet Connection'}
            </span>
          </div>
        </div>

        <div className="sidebar-user-wrap">
          <NavLink className="sidebar-user" to={profilePath} title="Open profile settings">
            <span className="sidebar-avatar-preview-wrap">
              <Avatar
                src={user?.avatarUrl}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size={44}
                className="sidebar-user-avatar"
              />
              {user?.avatarUrl && (
                <span className="sidebar-avatar-preview-popup">
                  <img src={user.avatarUrl} alt={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
                </span>
              )}
            </span>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <MdPerson className="sidebar-user-edit-icon" aria-hidden="true" />
          </NavLink>

          {onLogout && (
            <button className="sidebar-logout-btn" onClick={onLogout} aria-label="Logout">
              <MdLogout className="logout-icon" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
