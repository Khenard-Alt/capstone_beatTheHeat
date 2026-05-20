import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MdCampaign, MdThermostat, MdAutoAwesome } from 'react-icons/md';
import PrincipalAnnouncements from './PrincipalAnnouncements';
import PrincipalHeatData from './PrincipalHeatData';
import PrincipalAdvisories from './PrincipalAdvisories';
import '../../styles/AdminDashboard.css';

const AnnouncementShell: React.FC = () => {
  const { pathname } = useLocation();
  const content = pathname.endsWith('/heat-data') ? (
    <PrincipalHeatData />
  ) : pathname.endsWith('/advisories') ? (
    <PrincipalAdvisories />
  ) : (
    <PrincipalAnnouncements />
  );

  return (
    <div className="admin-dashboard" style={{ display: 'flex', gap: 20 }}>
      <aside
        style={{
          width: 240,
          minWidth: 240,
          background: '#fff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          padding: 16,
          height: 'fit-content',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#64748b', marginBottom: 12 }}>ANNOUNCEMENTS</div>
        <nav style={{ display: 'grid', gap: 8 }}>
          <ShellLink to="/principal/announcements" icon={<MdCampaign />} label="Announcements" end />
          <ShellLink to="/principal/announcements/heat-data" icon={<MdThermostat />} label="Heat Data" />
          <ShellLink to="/principal/announcements/advisories" icon={<MdAutoAwesome />} label="Advisories" />
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        {content}
      </main>
    </div>
  );
};

const ShellLink: React.FC<{ to: string; icon: React.ReactNode; label: string; end?: boolean }> = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 12,
      textDecoration: 'none',
      color: isActive ? '#fff' : '#334155',
      background: isActive ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : '#f8fafc',
      boxShadow: isActive ? '0 8px 18px rgba(37, 99, 235, 0.28)' : 'none',
      fontWeight: 700,
    })}
  >
    <span style={{ display: 'inline-flex', fontSize: 18 }}>{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default AnnouncementShell;
