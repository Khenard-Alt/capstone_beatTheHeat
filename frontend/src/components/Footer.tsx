import React from 'react';
import { Link } from 'react-router-dom';
import { SCHOOL_INFO } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import '../styles/Footer.css';

type FooterVariant = 'app' | 'public';

interface FooterProps {
  variant?: FooterVariant;
}

// Every role logs in through the same AppLayout/Footer, but each role's
// pages live under its own path (e.g. a parent has no /heat-index of their
// own) — so the "Dashboard" and other quick links used to 404 or land on a
// generic page that wasn't actually built for that role. Route each role to
// its own real pages instead of one hardcoded set of links for everyone.
const ROLE_QUICK_LINKS: Record<string, Array<{ label: string; to: string }>> = {
  parent: [
    { label: 'Parent Dashboard', to: '/parent/dashboard' },
    { label: 'Announcements', to: '/parent/announcements' },
    { label: 'Questions & Concerns', to: '/parent/questions-concerns' },
    { label: 'Chatbot', to: '/parent/chatbot' },
    { label: 'Profile / Settings', to: '/parent/profile-settings' },
  ],
  principal: [
    { label: 'Principal Dashboard', to: '/principal/dashboard' },
    { label: 'Reports', to: '/principal/reports' },
    { label: 'Announcements', to: '/principal/announcements' },
    { label: 'Heat Data', to: '/principal/announcements/heat-data' },
    { label: 'Advisories', to: '/principal/announcements/advisories' },
    { label: 'Chatbot', to: '/principal/chatbot' },
    { label: 'Profile / Settings', to: '/principal/profile-settings' },
  ],
  'head-teacher': [
    { label: 'Head Teacher Dashboard', to: '/head-teacher/dashboard' },
    { label: 'Incident Review', to: '/head-teacher/incident-review' },
    { label: 'Incident Reports', to: '/head-teacher/incident-reports' },
    { label: 'Advisories', to: '/head-teacher/advisories' },
    { label: 'Principal Announcements', to: '/head-teacher/announcements/principal' },
    { label: 'Chatbot', to: '/head-teacher/chatbot' },
    { label: 'Profile / Settings', to: '/head-teacher/profile-settings' },
  ],
  teacher: [
    { label: 'Teacher Dashboard', to: '/teacher/dashboard' },
    { label: 'Incident Reports', to: '/teacher/incident-reports' },
    { label: 'Advisories', to: '/teacher/advisories' },
    { label: 'Messages', to: '/teacher/messages' },
    { label: 'Staff Messages', to: '/teacher/staff-messages' },
    { label: 'Chatbot', to: '/teacher/chatbot' },
    { label: 'Profile / Settings', to: '/teacher/profile-settings' },
  ],
  admin: [
    { label: 'Admin Dashboard', to: '/admin' },
    { label: 'School Management', to: '/schools' },
    { label: 'Heat Index', to: '/heat-index' },
    { label: 'Health Advisory', to: '/health-advisory' },
    { label: 'Notifications', to: '/notifications' },
    { label: 'Profile', to: '/profile' },
    { label: 'Settings', to: '/settings' },
  ],
};

export const Footer: React.FC<FooterProps> = ({ variant = 'app' }) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const isPublicFooter = variant === 'public';
  const roleLinks = (user?.role && ROLE_QUICK_LINKS[user.role]) || [];

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">{SCHOOL_INFO.NAME}</h3>
          <p className="footer-text">{SCHOOL_INFO.ADDRESS}</p>
          <p className="footer-text">{SCHOOL_INFO.CONTACT}</p>
          <p className="footer-text">{SCHOOL_INFO.EMAIL}</p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            {isPublicFooter ? (
              <li>
                <Link to="/">Parent Dashboard</Link>
              </li>
            ) : roleLinks.length > 0 ? (
              roleLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))
            ) : (
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
            )}
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Resources</h4>
          <ul className="footer-links">
            {!isPublicFooter && (
              <li>
                <a
                  href="https://www.deped.gov.ph/2024/04/04/on-class-suspensions-and-shifting-to-adm-due-to-high-heat-index-other-calamities/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DepEd Guidelines
                </a>
              </li>
            )}
            <li>
              <a href="https://doh.gov.ph/press-release/doh-warns-against-heat-stroke/" target="_blank" rel="noopener noreferrer">
                Heat Safety Tips
              </a>
            </li>
            <li>
              <a href="https://ehotlines.e.gov.ph/" target="_blank" rel="noopener noreferrer">
                Emergency Contacts
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">About</h4>
          <p className="footer-description">
            {isPublicFooter
              ? 'Parent-facing heat safety dashboard for monitoring school heat conditions and student incident updates.'
              : 'AI-Integrated Smart Heat Index and Real-Time Health Advisory System designed to protect students and staff from heat-related risks.'}
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {currentYear} {SCHOOL_INFO.NAME}. All rights reserved.
        </p>
        <p className="footer-powered">
          Powered by Rose Ann Subdivision Devs.
        </p>
      </div>
    </footer>
  );
};
