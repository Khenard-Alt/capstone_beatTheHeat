import React, { useState } from 'react';
import { MdNotifications, MdPerson, MdSave } from 'react-icons/md';
import { Card } from '../../components/Card';
import { AvatarUpload } from '../../components/AvatarUpload';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/TeacherPanel.css';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
  const [email, setEmail] = useState(user?.email ?? '');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [defaultBrief, setDefaultBrief] = useState('Send me danger-level heat advisories and incident summaries.');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('Teacher settings updated locally. Connect this form to persistence when ready.');
  };

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Profile / Settings</h1>
        </div>
        <div className="teacher-hero-card">
          <AvatarUpload size={44} />
          <div>
            <strong>{user?.role ?? 'teacher'}</strong>
            <p>{user?.schoolId || 'school-1'}</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Account details" className="teacher-panel-card">
            <form onSubmit={handleSave} className="teacher-form-grid">
              <div className="teacher-form-field">
                <label htmlFor="displayName">Display name</label>
                <input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </div>
              <div className="teacher-form-field">
                <label htmlFor="email">Email</label>
                <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="teacher-form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="defaultBrief">Default safety brief</label>
                <textarea id="defaultBrief" value={defaultBrief} onChange={(event) => setDefaultBrief(event.target.value)} />
              </div>

              <div className="teacher-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary">
                  <MdSave /> Save settings
                </button>
              </div>

              {statusMessage && (
                <div className="teacher-sidebar-note" style={{ gridColumn: '1 / -1' }}>
                  {statusMessage}
                </div>
              )}
            </form>
          </Card>

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
              <div className="teacher-info-card">
                <div className="teacher-info-label">Role</div>
                <div className="teacher-info-value" style={{ fontSize: 16 }}>{user?.role || 'teacher'}</div>
              </div>
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