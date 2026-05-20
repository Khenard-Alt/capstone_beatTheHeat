import React from 'react';
import { Card } from '../../components/Card';
import '../../styles/AdminDashboard.css';

const ProfileSettings: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Profile / Settings</h1>
          <p>Manage your profile details and notification preferences.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Profile">
          <div style={{ padding: 12 }}>
            <p>Profile editing is available in your account menu.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;
