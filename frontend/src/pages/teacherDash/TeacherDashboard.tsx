import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { getGreeting } from '../../utils/helpers';
import { createIncident } from '../../services/incidents.service';
import IncidentModal from '../../components/IncidentModal';
import '../../styles/AdminDashboard.css';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading] = useState(false);
  const [isIncidentOpen, setIncidentOpen] = useState(false);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Teacher Dashboard</h1>
          <p>{getGreeting()}, {user?.firstName}. Manage class conditions and submit reports.</p>
        </div>
        <div className="admin-dashboard-badges">
          <span className="admin-badge">Teacher</span>
          <span className="admin-badge admin-badge-muted">
            {loading ? 'Loading...' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="admin-dashboard-stats">
        <Card className="admin-stat-card">
          <div className="admin-stat-label">Pending Forms</div>
          <div className="admin-stat-value">2</div>
          <div className="admin-stat-note">To submit</div>
        </Card>
        <Card className="admin-stat-card">
          <div className="admin-stat-label">Incidents Reported</div>
          <div className="admin-stat-value">1</div>
          <div className="admin-stat-note">This week</div>
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
          <Card title="Conduct Form - Student Conditions">
            <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
              <p>Fill up the conduct form to report student conditions during heat-related situations. Submit updates when needed.</p>
              <button className="btn btn-primary" style={{marginTop: '12px'}} onClick={() => setIncidentOpen(true)}>Submit Conduct Form</button>
              <IncidentModal isOpen={isIncidentOpen} onClose={() => setIncidentOpen(false)} />
            </div>
          </Card>

          <Card title="Heat Data, Advisories and Announcements">
            <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
              <p>View current heat data, safety advisories, and school announcements related to heat safety.</p>
            </div>
          </Card>

          <Card title="Incident Reports">
            <div style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
              <p>Submit incident reports when heat-related incidents occur in your class or school premises.</p>
              <button className="btn btn-primary" style={{marginTop: '12px'}} onClick={() => setIncidentOpen(true)}>Submit Incident Report</button>
            </div>
          </Card>
        </div>

        <div className="admin-dashboard-side">
          <Card title="Quick Actions">
            <div className="principal-actions">
              <button className="btn btn-primary" style={{width: '100%', marginBottom: '8px'}}>
                Fill Conduct Form
              </button>
              <button className="btn btn-secondary" style={{width: '100%'}}>
                Report Incident
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
