import React, { useState } from 'react';
import { MdNotifications, MdPerson } from 'react-icons/md';
import { Card } from '../../components/Card';
import { ProfileInformationCard } from '../../components/ProfileInformationCard';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/TeacherPanel.css';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Profile / Settings</h1>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <ProfileInformationCard className="teacher-panel-card" />

          <Card title="Notification preferences" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              <label className="teacher-info-card" style={{ cursor: 'pointer' }}>
                <div className="teacher-info-label">Email alerts</div>
                <div className="teacher-info-copy">Receive advisories and incident reminders in email.</div>
                <input type="checkbox" checked={notifyEmail} onChange={(event) => setNotifyEmail(event.target.checked)} style={{ marginTop: 10 }} />
              </label>
              <label className="teacher-info-card" style={{ cursor: 'pointer' }}>
                <div className="teacher-info-label">SMS alerts</div>
                <div className="teacher-info-copy">Get urgent danger-level warnings on mobile.</div>
                <input type="checkbox" checked={notifySms} onChange={(event) => setNotifySms(event.target.checked)} style={{ marginTop: 10 }} />
              </label>
              {/* <div className="teacher-info-card">
                <div className="teacher-info-label">Role</div>
                <div className="teacher-info-value" style={{ fontSize: 16 }}>{user?.role || 'teacher'}</div>
              </div> */}
            </div>
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="Profile summary" className="teacher-panel-card">
            <div className="teacher-pill-list">
              <span className="teacher-pill accent"><MdPerson /> {user?.firstName || 'Teacher'}</span>
              <span className="teacher-pill"><MdNotifications /> Alerts on</span>
            </div>
          </Card>

          <Card title="Settings tips" className="teacher-panel-card tone-alert">
            <ul className="teacher-list">
              <li>Keep your default brief short so it can be pasted into announcements quickly.</li>
              <li>Turn on SMS for danger-level heat if you are often outside class.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;