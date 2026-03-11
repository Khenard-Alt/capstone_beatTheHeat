import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { SCHOOL_INFO } from '../utils/constants';
import { MdSchool, MdLocationOn, MdPhone, MdEmail, MdEdit } from 'react-icons/md';
import '../styles/SchoolManagement.css';

export const SchoolManagement: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="school-management-page">
        <Card>
          <div className="no-access">
            <h2>Access Denied</h2>
            <p>You don't have permission to access school management.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="school-management-page">
      <div className="page-header">
        <h1>
          <MdSchool /> School Management
        </h1>
        <p>Manage school information and settings</p>
      </div>

      <div className="school-grid">
        <Card
          title="School Information"
          actions={<Button variant="outline" icon={<MdEdit />}>Edit</Button>}
        >
          <div className="school-info">
            <div className="info-item">
              <label>
                <MdSchool /> School Name
              </label>
              <p>{SCHOOL_INFO.NAME}</p>
            </div>

            <div className="info-item">
              <label>
                <MdLocationOn /> Address
              </label>
              <p>{SCHOOL_INFO.ADDRESS}</p>
            </div>

            <div className="info-item">
              <label>
                <MdPhone /> Contact Number
              </label>
              <p>{SCHOOL_INFO.CONTACT}</p>
            </div>

            <div className="info-item">
              <label>
                <MdEmail /> Email Address
              </label>
              <p>{SCHOOL_INFO.EMAIL}</p>
            </div>
          </div>
        </Card>

        <Card title="Heat Index Thresholds">
          <p className="card-description">
            Configure custom heat index thresholds for your school
          </p>

          <div className="threshold-settings">
            <Input
              label="Normal Threshold (°C)"
              type="number"
              value="27"
              fullWidth
            />
            <Input
              label="Caution Threshold (°C)"
              type="number"
              value="32"
              fullWidth
            />
            <Input
              label="Extreme Caution Threshold (°C)"
              type="number"
              value="41"
              fullWidth
            />
            <Input
              label="Danger Threshold (°C)"
              type="number"
              value="54"
              fullWidth
            />
          </div>

          <Button variant="primary">Update Thresholds</Button>
        </Card>
      </div>

      <Card title="User Management">
        <div className="user-management">
          <div className="user-stats">
            <div className="stat-box">
              <div className="stat-value">15</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">2</div>
              <div className="stat-label">Administrators</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">10</div>
              <div className="stat-label">Teachers</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">3</div>
              <div className="stat-label">Staff</div>
            </div>
          </div>

          <Button variant="primary">Manage Users</Button>
        </div>
      </Card>

      <Card title="System Settings">
        <div className="system-settings">
          <div className="setting-item">
            <label>
              <strong>Weather API Provider</strong>
              <select className="select-field">
                <option>OpenWeatherMap</option>
                <option>WeatherAPI</option>
                <option>AccuWeather</option>
              </select>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <strong>Data Refresh Interval</strong>
              <select className="select-field">
                <option>5 minutes</option>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
              </select>
            </label>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              <div>
                <strong>Enable Automatic Notifications</strong>
                <p>Send notifications when heat index thresholds are exceeded</p>
              </div>
            </label>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              <div>
                <strong>AI Advisory Generation</strong>
                <p>Use AI to generate personalized health advisories</p>
              </div>
            </label>
          </div>

          <Button variant="primary">Save Settings</Button>
        </div>
      </Card>
    </div>
  );
};
