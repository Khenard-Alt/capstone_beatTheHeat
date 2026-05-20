import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { getGreeting } from '../../utils/helpers';
import IncidentModal from '../../components/IncidentModal';
import { fetchAnnouncements, type Announcement } from '../../services/announcements.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/AdminDashboard.css';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading] = useState(false);
  const [isIncidentOpen, setIncidentOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const data = await fetchAnnouncements(8, 0);
        if (mounted) {
          setAnnouncements(data);
        }
      } catch (error) {
        console.error('Failed to load teacher announcements:', error);
        if (mounted) {
          setAnnouncements([]);
        }
      } finally {
        if (mounted) {
          setAnnouncementsLoading(false);
        }
      }
    };

    void loadAnnouncements();

    return () => {
      mounted = false;
    };
  }, []);

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
            <div style={{padding: '20px', color: '#64748b'}}>
              <p>View current heat data, safety advisories, and school announcements related to heat safety.</p>
              {announcementsLoading ? (
                <p style={{ marginTop: 12 }}>Loading school announcements...</p>
              ) : announcements.length === 0 ? (
                <p style={{ marginTop: 12 }}>No school announcements yet.</p>
              ) : (
                <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 14,
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                        <strong style={{ color: '#0f172a' }}>{announcement.title}</strong>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{announcement.priority ?? 'info'}</span>
                      </div>
                      <p style={{ margin: 0, color: '#334155' }}>{announcement.body}</p>
                      <small style={{ display: 'block', marginTop: 8, color: '#64748b' }}>
                        {announcement.created_at ? formatDateTimeGlobal(announcement.created_at) : ''}
                      </small>
                    </div>
                  ))}
                </div>
              )}
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
