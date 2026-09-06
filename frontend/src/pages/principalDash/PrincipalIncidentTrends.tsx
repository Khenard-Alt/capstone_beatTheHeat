import React from 'react';
import { Card } from '../../components/Card';
import '../../styles/AdminDashboard.css';

const PrincipalIncidentTrends: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Incident Trends</h1>
          <p>View heat-related incident patterns and follow-up trends for the school.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Trend Summary">
          <div style={{ padding: 12 }}>
            <p>No trend data loaded yet. Use the dashboard overview for the current summary.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrincipalIncidentTrends;
