import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MdSave, MdNotifications, MdPalette, MdLanguage } from 'react-icons/md';
import '../styles/Settings.css';

export const Settings: React.FC = () => {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    heatAlerts: true,
    advisoryAlerts: true,
    systemNotifications: false,
    theme: 'light',
    language: 'en',
    temperatureUnit: 'celsius',
    weatherUpdateFrequency: '15',
  });

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPreferences((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPreferences((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    console.log('Saving preferences:', preferences);
    // Save to backend
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your application preferences</p>
      </div>

      <div className="settings-grid">
        <Card title="Notification Preferences" icon={<MdNotifications />}>
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
        </Card>

        <Card title="Appearance" icon={<MdPalette />}>
          <div className="settings-section">
            <div className="setting-item">
              <label>
                <strong>Theme</strong>
                <select
                  name="theme"
                  value={preferences.theme}
                  onChange={handleSelectChange}
                  className="select-field"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </label>
            </div>

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
        </Card>

        <Card title="Regional Settings" icon={<MdLanguage />}>
          <div className="settings-section">
            <div className="setting-item">
              <label>
                <strong>Language</strong>
                <select
                  name="language"
                  value={preferences.language}
                  onChange={handleSelectChange}
                  className="select-field"
                >
                  <option value="en">English</option>
                  <option value="fil">Filipino</option>
                </select>
              </label>
            </div>
          </div>
        </Card>

        <Card title="Data & Updates">
          <div className="settings-section">
            <div className="setting-item">
              <label>
                <strong>Weather Update Frequency</strong>
                <select
                  name="weatherUpdateFrequency"
                  value={preferences.weatherUpdateFrequency}
                  onChange={handleSelectChange}
                  className="select-field"
                >
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
        </Card>
      </div>

      <div className="settings-actions">
        <Button variant="primary" icon={<MdSave />} onClick={handleSave}>
          Save Changes
        </Button>
        <Button variant="outline">Reset to Defaults</Button>
      </div>
    </div>
  );
};
