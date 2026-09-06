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
  const { user, updateUser } = useAuth();
  const [childrenData, setChildrenData] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: (user as any)?.phone || '',
    email: user?.email || '',
  });
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
      // include editable profile fields
      payload.firstName = profile.firstName;
      payload.lastName = profile.lastName;
      payload.phone = profile.phone;
      // only set newEmail when OTP verified
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
        // update auth context
        try { updateUser(updatedUser); } catch (_) {}
        setStatus({ saving: false, success: true, message: 'Preferences saved' });
      } else {
        setStatus({ saving: false, success: false, message: data?.message || 'Save failed' });
      }
    } catch (err: any) {
      setStatus({ saving: false, success: false, message: err?.response?.data?.message || 'Save failed' });
    }
  };

  // Fetch the current user's children (defensive fallbacks)
  React.useEffect(() => {
    if (!user) return;

    let mounted = true;

    const fetchChildren = async () => {
      setStatus({ saving: false });
      try {
        // Try fetching the full user object first (may contain relations)
        const userResp = await apiClient.get(`/api/users/${user.id}`);
        if (mounted && userResp?.data) {
          const maybeUser = userResp.data.user || userResp.data;
          if (maybeUser && (maybeUser.children || maybeUser.students || maybeUser.childList)) {
            const list = maybeUser.children || maybeUser.students || maybeUser.childList;
            setChildrenData(Array.isArray(list) ? list : []);
            return;
          }
        }
        // First try a user-specific route
        const tryUserChildren = await apiClient.get(`/api/users/${user.id}/children`);
        if (mounted && tryUserChildren?.data?.children) {
          setChildrenData(tryUserChildren.data.children);
          return;
        }
      } catch (err) {
        console.error('users/:id children fetch error', err);
        // surface a helpful status message for debugging
        setStatus({ saving: false, success: false, message: 'Unable to fetch linked children from /api/users/:id' });
      }

      try {
        // Fallback to students endpoint filtered by parentId
        const resp = await apiClient.get(`/api/students?parentId=${user.id}`);
        if (mounted && resp?.data?.data) {
          // some APIs return envelope
          const payload = resp.data.data || resp.data;
          setChildrenData(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        // silent fail — keep empty
        console.error('students?parentId fetch error', err);
        setChildrenData([]);
        setStatus({ saving: false, success: false, message: 'Unable to fetch students (parentId). Check API or auth.' });
      }
    };

    fetchChildren();

    return () => { mounted = false; };
  }, [user]);

  const childrenListFromUser: any[] = (user as any)?.children || (user as any)?.students || (user as any)?.childList || [];
  const childrenList: any[] = (childrenData && childrenData.length > 0) ? childrenData : childrenListFromUser;

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
        <Card title="Information" className="parent-portal-card parent-card-large" icon={<MdPerson />}>
          <div className="parent-profile-grid">
            <div>
              <span className="parent-profile-label">First name</span>
              <input className="parent-info-input" value={profile.firstName} onChange={(e) => setProfile((p: any) => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
            </div>
            <div>
              <span className="parent-profile-label">Last name</span>
              <input className="parent-info-input" value={profile.lastName} onChange={(e) => setProfile((p: any) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
            </div>
            <div>
              <span className="parent-profile-label">Email</span>
              <div className="parent-email-row">
                <input className="parent-info-input" value={newEmail || profile.email || ''} onChange={(e) => { setNewEmail(e.target.value); setProfile((p: any) => ({ ...p, email: e.target.value })); }} placeholder="Email address" />
                <Button variant="outline" size="small" onClick={sendOTP}>Send OTP</Button>
              </div>
              {otpSent && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                  <Button variant="primary" onClick={verifyOTP}>Verify</Button>
                </div>
              )}
            </div>
            <div>
              <span className="parent-profile-label">Phone</span>
              <input className="parent-info-input" value={profile.phone} onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: 6 }} className="parent-student-section">
              <div className="parent-student-header">
                <span className="parent-profile-label">Student(s)</span>
              </div>
              <div className="parent-student-list">
                {Array.isArray(childrenList) && childrenList.length > 0 ? (
                  childrenList.map((c: any) => (
                    <div key={c.id || c.studentId || c.name} className="parent-student-item">
                      <strong>{c.name || c.fullName || c.studentName}</strong>
                      <div className="parent-student-meta">{c.grade || c.year || ''}{c.section ? ` — ${c.section}` : ''}</div>
                    </div>
                  ))
                ) : (
                  <div className="parent-student-item"><em>No student information available</em></div>
                )}
              </div>
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