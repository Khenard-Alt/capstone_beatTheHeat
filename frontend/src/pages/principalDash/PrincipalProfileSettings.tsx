import React from 'react';
import { Card } from '../../components/Card';
import { AvatarUpload } from '../../components/AvatarUpload';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/AdminDashboard.css';

const PrincipalProfileSettings: React.FC = () => {
  const { user } = useAuth();

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
      </div>
    </div>
  );
};

export default PrincipalProfileSettings;
