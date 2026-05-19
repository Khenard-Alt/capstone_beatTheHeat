import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { getGreeting } from '../../utils/helpers';
import '../../styles/AdminDashboard.css';

export const HeadTeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading] = useState(false);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Head Teacher Dashboard</h1>
          <p>{getGreeting()}, {user?.firstName}. Review incident reports and suggestions.</p>
        </div>
        <div className="admin-dashboard-badges">
          <span className="admin-badge">Head Teacher</span>
          <span className="admin-badge admin-badge-muted">
            {loading ? 'Loading...' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="admin-dashboard-stats">
        <Card className="admin-stat-card">
          <div className="admin-stat-label">Pending Reviews</div>
          <div className="admin-stat-value">3</div>
          <div className="admin-stat-note">Incident reports</div>
        </Card>
        <Card className="admin-stat-card">
          <div className="admin-stat-label">Suggestions</div>
          <div className="admin-stat-value">5</div>
          <div className="admin-stat-note">To address</div>
        </Card>
        <Card className="admin-stat-card">
          <div className="admin-stat-label">Heat Status</div>
          <div className="admin-stat-value">Caution</div>
          <div className="admin-stat-note">Current level</div>
        </Card>
        <Card className="admin-stat-card">
          <div className="admin-stat-label">Last Update</div>
          <div className="admin-stat-value">Now</div>
          <div className="admin-stat-note">System synced</div>
        </Card>
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-main">
          <Card title="Incident Review and Suggestions">
            <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
              <p>Pending incident reviews will appear here. Review reports and provide suggestions for handling heat-related situations.</p>
            </div>
          </Card>

          <Card title="Heat Data, Advisories and Announcements">
            <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
              <p>Current heat advisories and school announcements related to heat safety will be displayed here.</p>
            </div>
          </Card>
        </div>

        <div className="admin-dashboard-side">
          <Card title="Quick Actions">
            <div className="principal-actions">
              <button className="btn btn-primary" style={{width: '100%', marginBottom: '8px'}}>
                Review Incidents
              </button>
              <button className="btn btn-secondary" style={{width: '100%'}}>
                View Advisories
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
