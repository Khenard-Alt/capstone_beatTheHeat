import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MdSave, MdNotifications } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { useTemperatureUnit } from '../context/TemperatureUnitContext';
import { isRealUserId } from '../utils/constants';
import '../styles/Settings.css';

const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  smsNotifications: false,
  heatAlerts: true,
  advisoryAlerts: true,
  systemNotifications: false,
  theme: 'light',
  language: 'en',
  temperatureUnit: 'celsius',
  weatherUpdateFrequency: '1',
};

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { setUnit } = useTemperatureUnit();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!isRealUserId(user?.id)) return;
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const { data } = await apiClient.get(`/api/users/${user.id}`);
        const maybeUser = data?.user || data;
        if (mounted && maybeUser?.notificationPreferences) {
          setPreferences((prev) => ({ ...prev, ...maybeUser.notificationPreferences }));
        }
      } catch (err) {
        console.error('Failed to load settings preferences:', err);
      }
    };

    void loadPreferences();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPreferences((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPreferences((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!isRealUserId(user?.id)) {
      if (preferences.temperatureUnit === 'celsius' || preferences.temperatureUnit === 'fahrenheit') {
        setUnit(preferences.temperatureUnit);
      }
      setStatusMessage('Signed in via the Admin Auth quick-unlock — preferences apply to this session only and are not saved to an account.');
      return;
    }

    setSaving(true);
    setStatusMessage('');
    try {
      const { data } = await apiClient.put(`/api/users/${user.id}`, { preferences });
      if (data?.success) {
        if (preferences.temperatureUnit === 'celsius' || preferences.temperatureUnit === 'fahrenheit') {
          setUnit(preferences.temperatureUnit);
        }
      }
      setStatusMessage(data?.success ? 'Preferences saved.' : (data?.message || 'Save failed.'));
    } catch (err: any) {
      setStatusMessage(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setStatusMessage('Reset to defaults — click Save Changes to apply.');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your application preferences</p>
      </div>

      <div className="settings-grid">
        <Card title="Settings" icon={<MdNotifications />}>
          <div className="settings-sections-grid">
          <div className="settings-section">
            <h3>Notification Channels</h3>
            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={preferences.emailNotifications}
                  onChange={handleCheckboxChange}
                />
                <div>
                  <strong>Email Notifications</strong>
                  <p>Receive notifications via email</p>
                </div>
              </label>
            </div>

            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="smsNotifications"
                  checked={preferences.smsNotifications}
                  onChange={handleCheckboxChange}
                />
                <div>
                  <strong>SMS Notifications</strong>
                  <p>Receive critical alerts via SMS</p>
                </div>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Alert Types</h3>
            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="heatAlerts"
                  checked={preferences.heatAlerts}
                  onChange={handleCheckboxChange}
                />
                <div>
                  <strong>Heat Index Alerts</strong>
                  <p>Get notified when heat index changes</p>
                </div>
              </label>
            </div>

            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="advisoryAlerts"
                  checked={preferences.advisoryAlerts}
                  onChange={handleCheckboxChange}
                />
                <div>
                  <strong>Health Advisory Alerts</strong>
                  <p>Receive health advisory notifications</p>
                </div>
              </label>
            </div>

            <div className="setting-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="systemNotifications"
                  checked={preferences.systemNotifications}
                  onChange={handleCheckboxChange}
                />
                <div>
                  <strong>System Notifications</strong>
                  <p>Updates and system messages</p>
                </div>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label>
                <strong>Temperature Unit</strong>
                <select
                  name="temperatureUnit"
                  value={preferences.temperatureUnit}
                  onChange={handleSelectChange}
                  className="select-field"
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </label>
            </div>
          </div>



          <div className="settings-section">
            <h3>Data & Updates</h3>
            <div className="setting-item">
              <label>
                <strong>Weather Update Frequency</strong>
                <select
                  name="weatherUpdateFrequency"
                  value={preferences.weatherUpdateFrequency}
                  onChange={handleSelectChange}
                  className="select-field"
                >
                  <option value="1">Every 1 minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every hour</option>
                </select>
              </label>
              <p className="setting-description">
                More frequent updates may consume more data
              </p>
            </div>
          </div>
          </div>
        </Card>
      </div>

      <div className="settings-actions">
        <Button variant="primary" icon={<MdSave />} onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={handleResetDefaults} disabled={saving}>
          Reset to Defaults
        </Button>
        {statusMessage && <span className="settings-status-message">{statusMessage}</span>}
      </div>
    </div>
  );
};
