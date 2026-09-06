import React, { useMemo, useState } from 'react';
import { MdNotifications, MdOutlineThermostat, MdPerson, MdSave } from 'react-icons/md';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/TeacherPanel.css';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
  const [email, setEmail] = useState(user?.email ?? '');
  const [receiveEmails, setReceiveEmails] = useState(true);
  const [receiveSms, setReceiveSms] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  const initials = useMemo(() => `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}` || 'HT', [user?.firstName, user?.lastName]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('Profile settings updated locally. Connect this form to persistence when ready.');
  };

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Profile / Settings</h1>
          <p>Manage your profile details and notification preferences while keeping the school safety palette consistent.</p>
        </div>
        <div className="teacher-hero-card">
          <div className="teacher-avatar">{initials}</div>
          <div>
            <strong>{user?.role || 'head-teacher'}</strong>
            <p>{user?.schoolId || 'school-1'}</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Profile" className="teacher-panel-card">
            <form onSubmit={handleSave} className="teacher-form-grid">
              <div className="teacher-form-field">
                <label htmlFor="displayName">Display name</label>
                <input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </div>

              <div className="teacher-form-field">
                <label htmlFor="email">Email</label>
                <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
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

          <Card title="Notification Preferences" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              <label className="teacher-info-card" style={{ cursor: 'pointer' }}>
                <div className="teacher-info-label">Email alerts</div>
                <div className="teacher-info-copy">Receive incident summaries and advisory notices through email.</div>
                <input type="checkbox" checked={receiveEmails} onChange={(event) => setReceiveEmails(event.target.checked)} style={{ marginTop: 10 }} />
              </label>

              <label className="teacher-info-card" style={{ cursor: 'pointer' }}>
                <div className="teacher-info-label">SMS alerts</div>
                <div className="teacher-info-copy">Get urgent heat warnings and incident escalation notices on mobile.</div>
                <input type="checkbox" checked={receiveSms} onChange={(event) => setReceiveSms(event.target.checked)} style={{ marginTop: 10 }} />
              </label>

              <div className="teacher-info-card">
                <div className="teacher-info-label">Role</div>
                <div className="teacher-info-value" style={{ fontSize: 16 }}>{user?.role || 'head-teacher'}</div>
                <div className="teacher-info-copy">This panel follows the school heat safety workflow and blue-cyan palette.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="Profile Summary" className="teacher-panel-card">
            <div className="teacher-pill-list">
              <span className="teacher-pill accent"><MdPerson /> {user?.firstName || 'Head Teacher'}</span>
              <span className="teacher-pill"><MdNotifications /> Alerts on</span>
              <span className="teacher-pill"><MdOutlineThermostat /> Heat-safe workflow</span>
            </div>
          </Card>

          <Card title="Settings Tips" className="teacher-panel-card tone-alert">
            <ul className="teacher-list">
              <li>Keep notifications active for danger-level heat advisories.</li>
              <li>Use a shared display name that matches your official school role.</li>
              <li>Check the incident review page before sending school-wide updates.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
