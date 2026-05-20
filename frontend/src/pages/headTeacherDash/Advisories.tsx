import React from 'react';
import { Card } from '../../components/Card';
import '../../styles/AdminDashboard.css';

const Advisories: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Heat Advisories</h1>
          <p>Current heat advisories and recommended actions for school operations.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Active Advisories">
          <div style={{ padding: 12 }}>
            <p>No active advisories at the moment.</p>
            <p className="muted">This section will show AI-generated or manually created advisories.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Advisories;
