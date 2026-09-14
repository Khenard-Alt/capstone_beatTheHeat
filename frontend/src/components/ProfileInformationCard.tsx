import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AvatarUpload } from './AvatarUpload';
import { useAuth } from '../hooks/useAuth';
import { MdPerson, MdLock, MdSave } from 'react-icons/md';
import { apiClient } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';
import { changeUserPassword } from '../services/users.service';
import '../styles/ParentPortalPages.css';

interface SaveStatus {
  saving: boolean;
  success?: boolean;
  message?: string;
}

/**
 * Shared "Information" card — avatar, editable name/phone/email(+OTP), and a
 * collapsible change/set-password section. Used by every role's Profile /
 * Settings page so the layout and behavior stay identical across roles
 * instead of each page reimplementing (or, previously, stubbing out) its
 * own save logic.
 */
export const ProfileInformationCard: React.FC<{ className?: string; extraFields?: React.ReactNode }> = ({ className, extraFields }) => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: (user as any)?.phone || '',
    email: user?.email || '',
  });
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ saving: false });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<SaveStatus>({ saving: false });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const isGoogleAccount = Boolean((user as any)?.isGoogleAccount);

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

  const saveInfo = async () => {
    if (!user) return;
    setStatus({ saving: true });
    try {
      const payload: any = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      };
      if (otpVerified && newEmail) payload.newEmail = newEmail;

      const { data } = await apiClient.put(`/api/users/${user.id}`, payload);

      if (data?.success) {
        const updatedUser = data.user;
        try {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        } catch (_) {
          // ignore
        }
        try { updateUser(updatedUser); } catch (_) {}
        setStatus({ saving: false, success: true, message: 'Information saved' });
      } else {
        setStatus({ saving: false, success: false, message: data?.message || 'Save failed' });
      }
    } catch (err: any) {
      setStatus({ saving: false, success: false, message: err?.response?.data?.message || 'Save failed' });
    }
  };

  const submitPasswordChange = async () => {
    if (!user) return;

    if (newPassword.length < 8) {
      setPasswordStatus({ saving: false, success: false, message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ saving: false, success: false, message: 'Passwords do not match.' });
      return;
    }
    if (!isGoogleAccount && !currentPassword) {
      setPasswordStatus({ saving: false, success: false, message: 'Enter your current password.' });
      return;
    }

    setPasswordStatus({ saving: true });
    try {
      await changeUserPassword(user.id, newPassword, isGoogleAccount ? undefined : currentPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ saving: false, success: true, message: isGoogleAccount ? 'Password set successfully.' : 'Password changed successfully.' });
    } catch (err) {
      setPasswordStatus({ saving: false, success: false, message: err instanceof Error ? err.message : 'Failed to update password.' });
    }
  };

  return (
    <Card title="Information" className={className ?? 'parent-portal-card'} icon={<MdPerson />}>
      <div className="parent-profile-identity">
        <AvatarUpload size={72} />
        <div>
          <strong>{user?.firstName} {user?.lastName}</strong>
          <p>{user?.email}</p>
        </div>
      </div>
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
          <span className="parent-profile-label">Phone</span>
          <input className="parent-info-input" value={profile.phone} onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
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
          <Button
            variant="outline"
            size="small"
            icon={<MdLock />}
            onClick={() => setShowPasswordSection((v) => !v)}
            style={{ marginTop: 10 }}
          >
            {showPasswordSection ? 'Hide password fields' : (isGoogleAccount ? 'Set Password' : 'Change Password')}
          </Button>

          {showPasswordSection && (
            <div className="parent-password-inline">
              {isGoogleAccount ? (
                <div style={{ gridColumn: '1 / -1' }} className="parent-password-google-note">
                  Your account is linked to Google Sign-In. Set a password below to also allow signing in with email and password.
                </div>
              ) : (
                <div>
                  <span className="parent-profile-label">Current password</span>
                  <input
                    className="parent-info-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                  />
                </div>
              )}
              <div>
                <span className="parent-profile-label">New password</span>
                <input
                  className="parent-info-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <span className="parent-profile-label">Confirm new password</span>
                <input
                  className="parent-info-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Button variant="primary" icon={<MdLock />} onClick={submitPasswordChange} disabled={passwordStatus.saving}>
                  {passwordStatus.saving ? 'Saving...' : isGoogleAccount ? 'Set Password' : 'Change Password'}
                </Button>
                {passwordStatus.message && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: passwordStatus.success ? '#16a34a' : '#dc2626' }}>
                    {passwordStatus.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {extraFields}

        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
          <Button variant="primary" icon={<MdSave />} onClick={saveInfo} disabled={status.saving}>
            {status.saving ? 'Saving...' : 'Save Information'}
          </Button>
          {status.message && (
            <span style={{ fontSize: 13, fontWeight: 600, color: status.success ? '#16a34a' : '#dc2626' }}>
              {status.message}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
