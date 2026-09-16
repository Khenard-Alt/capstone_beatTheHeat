import React, { useEffect, useState } from 'react';
import { MdNotifications, MdOutlineThermostat, MdPerson, MdSave } from 'react-icons/md';
import { Card } from '../../components/Card';
import { ProfileInformationCard } from '../../components/ProfileInformationCard';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import { isRealUserId } from '../../utils/constants';
import '../../styles/TeacherPanel.css';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [receiveEmails, setReceiveEmails] = useState(true);
  const [receiveSms, setReceiveSms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!isRealUserId(user?.id)) return;
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const { data } = await apiClient.get(`/api/users/${user.id}`);
        const maybeUser = data?.user || data;
        const prefs = maybeUser?.notificationPreferences;
        if (mounted && prefs) {
          if (typeof prefs.receiveEmails === 'boolean') setReceiveEmails(prefs.receiveEmails);
          if (typeof prefs.receiveSms === 'boolean') setReceiveSms(prefs.receiveSms);
        }
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      }
    };

    void loadPreferences();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const savePreferences = async () => {
    if (!isRealUserId(user?.id)) {
      setStatusMessage('Not signed in to a real account — preferences cannot be saved.');
      return;
    }
    setSaving(true);
    setStatusMessage('');
    try {
      const { data } = await apiClient.put(`/api/users/${user.id}`, {
        preferences: { receiveEmails, receiveSms },
      });
      setStatusMessage(data?.success ? 'Preferences saved.' : (data?.message || 'Save failed.'));
    } catch (err: any) {
      setStatusMessage(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Profile / Settings</h1>
          <p>Manage your profile details and notification preferences while keeping the school safety palette consistent.</p>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <ProfileInformationCard className="teacher-panel-card" />

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
            <div className="teacher-form-actions" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" className="btn btn-primary" onClick={() => void savePreferences()} disabled={saving}>
                <MdSave /> {saving ? 'Saving...' : 'Save Preferences'}
              </button>
              {statusMessage && <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{statusMessage}</span>}
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
