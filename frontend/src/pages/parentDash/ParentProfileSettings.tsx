import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProfileInformationCard } from '../../components/ProfileInformationCard';
import { ParentStudentList } from '../../components/ParentStudentList';
import { useAuth } from '../../hooks/useAuth';
import { MdNotifications, MdTune, MdSave } from 'react-icons/md';
import '../../styles/ParentPortalPages.css';
import { apiClient } from '../../services/api';

export const ParentProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    smsAlerts: false,
    weeklyDigest: true,
    chatFollowUps: true,
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setPreferences((prev) => ({ ...prev, [name]: checked }));
  };

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const { data } = await apiClient.get(`/api/users/${user.id}`);
        const maybeUser = data?.user || data;
        if (mounted && maybeUser?.notificationPreferences) {
          setPreferences((prev) => ({ ...prev, ...maybeUser.notificationPreferences }));
        }
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      }
    };

    void loadPreferences();
    return () => { mounted = false; };
  }, [user]);

  const savePreferences = async () => {
    if (!user) return;
    setSaving(true);
    setStatusMessage('');
    try {
      const { data } = await apiClient.put(`/api/users/${user.id}`, { preferences });
      setStatusMessage(data?.success ? 'Preferences saved' : (data?.message || 'Save failed'));
    } catch (err: any) {
      setStatusMessage(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="parent-profile-settings-page">
      <div className="parent-portal-hero">
        <div>
          <p className="parent-portal-eyebrow">Account</p>
          <h1>Profile / Settings</h1>
          <p>Manage your personal information and the notifications you want to receive from the heat safety system.</p>
        </div>
      </div>

      <Card title="Parent Guidance Notes" className="parent-portal-card" icon={<MdTune />}>
        <ul className="parent-profile-notes">
          <li>Keep the scope on school heat advisories and child safety.</li>
          <li>Use the chatbot for quick questions and the advisory page for formal guidance.</li>
          <li>Check announcements when school operations change.</li>
        </ul>
      </Card>

      <div className="parent-portal-sections parent-portal-sections-split">
        <ProfileInformationCard extraFields={<ParentStudentList />} />

        <div className="parent-portal-side-col">
          <Card title="Parent Notification Settings" className="parent-portal-card" icon={<MdNotifications />}>
            <div className="parent-settings-list">
              {[
                { name: 'emailAlerts', title: 'Email heat alerts', note: 'Receive important heat notices by email.' },
                { name: 'smsAlerts', title: 'SMS emergency alerts', note: 'Use text messages for high priority warnings.' },
                { name: 'weeklyDigest', title: 'Weekly digest', note: 'Get a summary of recent advisories and school updates.' },
                { name: 'chatFollowUps', title: 'Chat follow-up reminders', note: 'Save a record of important AI advisory questions.' },
              ].map((setting) => (
                <label key={setting.name} className="parent-setting-item">
                  <div>
                    <strong>{setting.title}</strong>
                    <p>{setting.note}</p>
                  </div>
                  <input
                    type="checkbox"
                    name={setting.name}
                    checked={preferences[setting.name as keyof typeof preferences]}
                    onChange={handleToggle}
                  />
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="parent-profile-actions">
        <Button variant="primary" icon={<MdSave />} onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Notification Preferences'}
        </Button>
        {statusMessage && <span style={{ fontSize: 13, fontWeight: 600 }}>{statusMessage}</span>}
      </div>
    </div>
  );
};
