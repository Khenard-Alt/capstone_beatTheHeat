import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCampaign, MdCheckCircle, MdHealthAndSafety, MdOutlineAssignment, MdOutlineThermostat } from 'react-icons/md';
import { Card } from '../../components/Card';
import IncidentModal from '../../components/IncidentModal';
import { useAuth } from '../../hooks/useAuth';
import { fetchAnnouncements, type Announcement } from '../../services/announcements.service';
import { fetchIncidents, type IncidentRecord } from '../../services/incidents.service';
import { fetchHealthAdvisories, fetchRealtimeAdvisory, type LoggedAdvisory, type RealtimeAdvisoryResponse } from '../../services/healthAdvisory.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import { getGreeting } from '../../utils/helpers';
import '../../styles/TeacherPanel.css';

type DashboardIncident = IncidentRecord;

export const HeadTeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [advisories, setAdvisories] = useState<LoggedAdvisory[]>([]);
  const [realtimeAdvisory, setRealtimeAdvisory] = useState<RealtimeAdvisoryResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [incidentData, announcementData, advisoryData, liveAdvisory] = await Promise.all([
          fetchIncidents(12, 0),
          fetchAnnouncements(6, 0),
          fetchHealthAdvisories(6, 0),
          fetchRealtimeAdvisory(),
        ]);

        if (!mounted) {
          return;
        }

        setIncidents(incidentData);
        setAnnouncements(announcementData);
        setAdvisories(advisoryData);
        setRealtimeAdvisory(liveAdvisory);
      } catch (error) {
        console.error('Failed to load head teacher dashboard:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  // Filter out announcements that are parent-facing so the head teacher panel
  // only shows staff-focused guidance.
  const headTeacherAnnouncements = useMemo(
    () => announcements.filter((a) => !/\bparents?\b/i.test(`${a.title} ${a.body}`)),
    [announcements]
  );

  const stats = useMemo(() => ([
    { label: 'Pending Reviews', value: incidents.filter((item) => item.status === 'pending').length || incidents.length || 0, note: 'For head teacher action' },
    { label: 'Open Advisories', value: advisories.length || headTeacherAnnouncements.length || 0, note: 'Current school guidance' },
    { label: 'Heat Level', value: realtimeAdvisory?.riskLevel?.toUpperCase() || 'DANGER', note: 'Live advisory' },
    { label: 'Reports Logged', value: incidents.length || 0, note: 'Recent incident rows' },
  ]), [advisories.length, headTeacherAnnouncements.length, incidents, realtimeAdvisory?.riskLevel]);

  const quickActions = [
    { label: 'Review incidents', action: () => navigate('/head-teacher/incident-review') },
    { label: 'Open incident reports', action: () => navigate('/head-teacher/incident-reports') },
    { label: 'View advisories', action: () => navigate('/head-teacher/advisories') },
    { label: 'Ask chatbot', action: () => navigate('/head-teacher/chatbot') },
  ];
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const refreshIncidents = async () => {
    try {
      const data = await fetchIncidents(12, 0);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to refresh incidents', err);
    }
  };

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Incident Command Center</h1>
          <p>
            {getGreeting()}, {user?.firstName}. Review reports, coordinate responses, and keep advisories aligned with the school palette and safety workflow.
          </p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineThermostat className="teacher-hero-icon" />
          <div>
            <strong>{realtimeAdvisory?.riskLevel?.toUpperCase() || 'DANGER'}</strong>
            <p>{realtimeAdvisory?.summary || 'Live heat advisory and incident data loading.'}</p>
          </div>
        </div>
      </div>

      <div className="teacher-stats-grid">
        {stats.map((stat) => (
          <Card key={stat.label} className="teacher-stat-card">
            <div className="teacher-stat-label">{stat.label}</div>
            <div className="teacher-stat-value">{loading ? '...' : stat.value}</div>
            <div className="teacher-stat-note">{stat.note}</div>
          </Card>
        ))}
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Incident Review and Suggestions" className="teacher-panel-card tone-alert">
            <div className="teacher-section-grid">
              {incidents.slice(0, 3).map((incident) => (
                <div key={incident.id} className="teacher-info-card">
                  <div className="teacher-info-label">{incident.status || 'pending'}</div>
                  <div className="teacher-info-value" style={{ fontSize: 16 }}>{incident.studentName || 'Unknown student'}</div>
                  <div className="teacher-info-copy">
                    {[incident.gradeLevel, incident.section].filter(Boolean).join(' - ') || 'Grade / section unavailable'}
                  </div>
                  <div className="teacher-info-copy" style={{ marginTop: 8 }}>
                    {incident.description || 'No description provided.'}
                  </div>
                  {incident.aiSuggestion && (
                    <div className="teacher-sidebar-note" style={{ marginTop: 10, borderLeft: '4px solid #2563eb' }}>
                      <strong>AI suggestion:</strong> {incident.aiSuggestion}
                    </div>
                  )}
                </div>
              ))}
              {incidents.length === 0 && (
                <div className="teacher-info-copy">No incident rows loaded yet. The review workflow will show here once data is available.</div>
              )}
            </div>
          </Card>

          <Card title="Heat Data, Advisories and Announcements" className="teacher-panel-card">
            <div className="teacher-grid-two">
              <div className="teacher-info-card">
                <div className="teacher-info-label">Current advisory</div>
                <div className="teacher-info-value" style={{ fontSize: 16 }}>{realtimeAdvisory?.riskLevel || 'danger'}</div>
                <div className="teacher-info-copy">{realtimeAdvisory?.summary || 'No realtime advisory available.'}</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Latest announcements</div>
                <div className="teacher-info-copy">
                  {headTeacherAnnouncements.length === 0 ? (
                    'No announcements loaded.'
                  ) : (
                    headTeacherAnnouncements.slice(0, 3).map((announcement) => (
                      <div key={announcement.id} style={{ marginBottom: 10 }}>
                        <strong style={{ display: 'block' }}>{announcement.title}</strong>
                        <span>{announcement.body}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Recent Incident Reports" className="teacher-panel-card">
            {incidents.length === 0 ? (
              <div className="teacher-info-copy">No incident reports available yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Grade / Section</th>
                      <th>Incident Type</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.slice(0, 5).map((incident) => (
                      <tr key={incident.id}>
                        <td><strong>{incident.studentName || 'Unknown student'}</strong></td>
                        <td>{[incident.gradeLevel, incident.section].filter(Boolean).join(' - ') || '—'}</td>
                        <td>{incident.incidentType}</td>
                        <td><span className={`teacher-status ${String(incident.status).toLowerCase()}`}>{incident.status}</span></td>
                        <td>{incident.timestamp ? formatDateTimeGlobal(incident.timestamp) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="Quick Actions" className="teacher-panel-card">
            <div className="teacher-pill-list" style={{ marginBottom: 16 }}>
              {quickActions.map((item) => (
                <button key={item.label} type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={item.action}>
                  {item.label}
                </button>
              ))}
            </div>
            <div>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowIncidentModal(true)}>Report Incident</button>
            </div>
            <IncidentModal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)} onReported={refreshIncidents} />
          </Card>

          <Card title="Review Priorities" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              <div className="teacher-info-card">
                <div className="teacher-info-label"><MdCheckCircle /> Immediate review</div>
                <div className="teacher-info-copy">Check any report with danger-level heat or repeated symptoms first.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label"><MdCampaign /> Teacher notices</div>
                <div className="teacher-info-copy">Coordinate with teachers if classroom changes are needed.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label"><MdOutlineAssignment /> Follow-up</div>
                <div className="teacher-info-copy">Use the report log to document treated, monitoring, and resolved cases.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label"><MdHealthAndSafety /> Safety alignment</div>
                <div className="teacher-info-copy">Keep the advisory language consistent for principals and school staff.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HeadTeacherDashboard;