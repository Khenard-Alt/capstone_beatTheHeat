import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { MdNotifications, MdPerson, MdTune, MdSave } from 'react-icons/md';
import '../../styles/ParentPortalPages.css';
import { apiClient } from '../../services/api';
import { STORAGE_KEYS } from '../../utils/constants';

interface SaveStatus {
  saving: boolean;
  success?: boolean;
  message?: string;
}

export const ParentProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    smsAlerts: false,
    weeklyDigest: true,
    chatFollowUps: true,
  });
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ saving: false });

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setPreferences((prev) => ({ ...prev, [name]: checked }));
  };

  const sendOTP = async () => {
    if (!newEmail) return;
    try {
      setStatus({ saving: false });
      await apiClient.post('/api/users/send-otp', { email: newEmail });
      setOtpSent(true);
      setOtpVerified(false);
    } catch (err: any) {
      setStatus({ saving: false, success: false, message: err?.response?.data?.message || 'Failed to send OTP' });
    }
  };

  const verifyOTP = async () => {
    if (!newEmail || !otpCode) return;
    try {
      const { data } = await apiClient.post('/api/users/verify-otp', { email: newEmail, code: otpCode });
      if (data?.success) {
        setOtpVerified(true);
        setStatus({ saving: false, success: true, message: 'Email verified' });
      } else {
        setStatus({ saving: false, success: false, message: data?.message || 'Verification failed' });
      }
    } catch (err: any) {
      setStatus({ saving: false, success: false, message: err?.response?.data?.message || 'Verification failed' });
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setStatus({ saving: true });
    try {
      const payload: any = { preferences };
      if (otpVerified && newEmail) payload.newEmail = newEmail;

      const { data } = await apiClient.put(`/api/users/${user.id}`, payload);

      if (data?.success) {
        // update local user snapshot in localStorage
        const updatedUser = data.user;
        try {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        } catch (_) {
          // ignore
        }
        setStatus({ saving: false, success: true, message: 'Preferences saved' });
      } else {
        setStatus({ saving: false, success: false, message: data?.message || 'Save failed' });
      }
    } catch (err: any) {
      setStatus({ saving: false, success: false, message: err?.response?.data?.message || 'Save failed' });
    }
  };

  return (
    <div className="parent-profile-settings-page">
      <div className="parent-portal-hero">
        <div>
          <p className="parent-portal-eyebrow">Account</p>
          <h1>Profile / Settings</h1>
          <p>Manage parent contact details and the notifications you want to receive from the heat safety system.</p>
        </div>
        <div className="parent-portal-hero-card">
          <MdPerson className="parent-portal-hero-icon" />
          <div>
            <strong>{user?.firstName} {user?.lastName}</strong>
            <p>{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="parent-portal-sections">
        <Card title="Profile Snapshot" className="parent-portal-card" icon={<MdPerson />}>
          <div className="parent-profile-grid">
            <div>
              <span className="parent-profile-label">Name</span>
              <strong>{user?.firstName} {user?.lastName}</strong>
            </div>
            <div>
              <span className="parent-profile-label">Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div>
              <span className="parent-profile-label">Role</span>
              <strong className="parent-profile-role">{user?.role}</strong>
            </div>
            <div>
              <span className="parent-profile-label">School ID</span>
              <strong>{user?.schoolId}</strong>
            </div>
          </div>
        </Card>

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

        <Card title="Parent Guidance Notes" className="parent-portal-card" icon={<MdTune />}>
          <ul className="parent-profile-notes">
            <li>Keep the scope on school heat advisories and child safety.</li>
            <li>Use the chatbot for quick questions and the advisory page for formal guidance.</li>
            <li>Check announcements when school operations change.</li>
          </ul>
        </Card>
        <Card title="Change Email" className="parent-portal-card" icon={<MdPerson />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="New email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" onClick={sendOTP}>Send OTP</Button>
              {otpSent && (
                <>
                  <input placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                  <Button variant="primary" onClick={verifyOTP}>Verify OTP</Button>
                </>
              )}
            </div>
            {status.message && <div style={{ color: status.success ? 'green' : 'red' }}>{status.message}</div>}
          </div>
        </Card>
      </div>

      <div className="parent-profile-actions">
        <Button variant="primary" icon={<MdSave />} onClick={savePreferences} disabled={status.saving}>
          {status.saving ? 'Saving...' : 'Save Preferences'}
        </Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </div>
  );
};