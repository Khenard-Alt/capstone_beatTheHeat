import React, { useEffect, useState } from 'react';
import { MdNotifications, MdPerson, MdSave } from 'react-icons/md';
import { Card } from '../../components/Card';
import { ProfileInformationCard } from '../../components/ProfileInformationCard';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import { isRealUserId } from '../../utils/constants';
import '../../styles/TeacherPanel.css';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
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
          if (typeof prefs.notifyEmail === 'boolean') setNotifyEmail(prefs.notifyEmail);
          if (typeof prefs.notifySms === 'boolean') setNotifySms(prefs.notifySms);
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
        preferences: { notifyEmail, notifySms },
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
            <div className="teacher-form-actions" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" className="btn btn-primary" onClick={() => void savePreferences()} disabled={saving}>
                <MdSave /> {saving ? 'Saving...' : 'Save Preferences'}
              </button>
              {statusMessage && <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{statusMessage}</span>}
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