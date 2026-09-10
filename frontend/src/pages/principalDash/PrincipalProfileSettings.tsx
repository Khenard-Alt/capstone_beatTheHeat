import React, { useEffect, useState } from 'react';
import { MdOpenInNew, MdTv, MdCampaign, MdSave } from 'react-icons/md';
import { Card } from '../../components/Card';
import { AvatarUpload } from '../../components/AvatarUpload';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import '../../styles/AdminDashboard.css';

const PrincipalProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [alertActive, setAlertActive] = useState(false);
  const [alertTitle, setAlertTitle] = useState('CLASS SUSPENSION');
  const [alertMessage, setAlertMessage] = useState('All classes are suspended.');
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertStatusMessage, setAlertStatusMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadAlert = async () => {
      try {
        const { data } = await apiClient.get('/api/campus-alert');
        if (mounted && data?.data) {
          setAlertActive(Boolean(data.data.active));
          setAlertTitle(data.data.title || 'CLASS SUSPENSION');
          setAlertMessage(data.data.message || 'All classes are suspended.');
        }
      } catch (error) {
        console.error('Failed to load campus alert:', error);
      }
    };

    void loadAlert();
    return () => {
      mounted = false;
    };
  }, []);

  const saveAlert = async (nextActive: boolean) => {
    setSavingAlert(true);
    setAlertStatusMessage('');
    try {
      const { data } = await apiClient.put('/api/campus-alert', {
        active: nextActive,
        title: alertTitle,
        message: alertMessage,
      });
      if (data?.success) {
        setAlertActive(nextActive);
        setAlertStatusMessage(nextActive ? 'Suspension banner is now showing on the Front Screen.' : 'Suspension banner turned off.');
        try {
          // Same-origin ping so any open Front Screen tab refetches instantly
          // instead of waiting for its next poll — this banner faces the
          // public and has to flip the moment the principal toggles it.
          localStorage.setItem('campus-alert-updated-at', String(Date.now()));
        } catch (storageError) {
          console.error('Failed to broadcast campus alert update:', storageError);
        }
      } else {
        setAlertStatusMessage(data?.message || 'Failed to update.');
      }
    } catch (error) {
      console.error('Failed to save campus alert:', error);
      setAlertStatusMessage('Failed to update. Please try again.');
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Profile / Settings</h1>
          <p>Manage principal account details and preferences.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Account Settings">
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <AvatarUpload size={64} />
            <div>
              <strong style={{ display: 'block', color: '#0f172a' }}>{user?.firstName} {user?.lastName}</strong>
              <p style={{ margin: '4px 0 0' }}>{user?.email}</p>
            </div>
          </div>
          <div style={{ padding: '0 12px 12px' }}>
            <p>Profile editing is handled through the main account settings screen.</p>
          </div>
        </Card>

        <div style={{ marginTop: 16 }}>
          <Card title="Class Suspension Alert (temporary manual override)">
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                Turn this on to show a large suspension banner in the middle of the Front Screen TV display —
                use it for manual announcements like early dismissal, independent of the automatic heat advisory.
              </p>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Banner title</span>
                <input
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="CLASS SUSPENSION"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Message</span>
                <textarea
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="All classes are suspended po at 1:00 pm."
                  rows={3}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alertActive}
                    onChange={(e) => void saveAlert(e.target.checked)}
                    disabled={savingAlert}
                  />
                  <span style={{ fontWeight: 700, color: alertActive ? '#dc2626' : '#334155' }}>
                    {alertActive ? 'Banner is LIVE on Front Screen' : 'Banner is off'}
                  </span>
                </label>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void saveAlert(alertActive)}
                  disabled={savingAlert}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <MdSave /> Save wording
                </button>
              </div>

              {alertStatusMessage && (
                <div style={{ fontSize: 13, color: alertActive ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  <MdCampaign style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {alertStatusMessage}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <Card title="Campus Display">
            <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <MdTv style={{ fontSize: 28, color: '#2563eb' }} />
                <div>
                  <strong style={{ display: 'block', color: '#0f172a' }}>Front Screen (TV Display)</strong>
                  <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                    Opens a fullscreen board with live weather, heat advisories, and announcements — meant for a lobby TV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.open('/front-screen', '_blank', 'noopener,noreferrer')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
              >
                <MdOpenInNew /> View Front Screen
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrincipalProfileSettings;
