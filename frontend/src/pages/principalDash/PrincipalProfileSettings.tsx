import React from 'react';
import { Card } from '../../components/Card';
import '../../styles/AdminDashboard.css';

const PrincipalProfileSettings: React.FC = () => {
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
          <div style={{ padding: 12 }}>
            <p>Profile editing is handled through the main account settings screen.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrincipalProfileSettings;
