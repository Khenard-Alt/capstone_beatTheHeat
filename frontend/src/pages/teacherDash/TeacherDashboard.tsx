import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle, MdDateRange, MdHealthAndSafety, MdOutlineThermostat } from 'react-icons/md';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { getGreeting } from '../../utils/helpers';
import { fetchAnnouncements, type Announcement } from '../../services/announcements.service';
import { fetchIncidents, type IncidentRecord } from '../../services/incidents.service';
import { fetchRealtimeAdvisory, type RealtimeAdvisoryResponse } from '../../services/healthAdvisory.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/TeacherPanel.css';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [realtimeAdvisory, setRealtimeAdvisory] = useState<RealtimeAdvisoryResponse | null>(null);

  const latestIncident = incidents[0];

  const teacherStats = useMemo(() => ([
    { label: 'Pending Forms', value: Math.max(1, incidents.filter((item) => item.status === 'pending').length || 2), note: 'Need review' },
    { label: 'Incidents Logged', value: incidents.length || 3, note: 'This period' },
    { label: 'Heat Level', value: realtimeAdvisory?.riskLevel || 'danger', note: 'Live advisory' },
    { label: 'Announcements', value: announcements.length || 0, note: 'Recent school notices' },
  ]), [announcements.length, incidents.length, realtimeAdvisory?.riskLevel]);

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

  useEffect(() => {
    let mounted = true;

    const loadIncidents = async () => {
      try {
        setIncidentsLoading(true);
        const data = await fetchIncidents(5, 0);
        if (mounted) {
          setIncidents(data);
        }
      } catch (error) {
        console.error('Failed to load teacher incidents:', error);
        if (mounted) {
          setIncidents([]);
        }
      } finally {
        if (mounted) {
          setIncidentsLoading(false);
        }
      }
    };

    const loadRealtimeAdvisory = async () => {
      try {
        const data = await fetchRealtimeAdvisory();
        if (mounted) {
          setRealtimeAdvisory(data);
        }
      } catch (error) {
        console.error('Failed to load realtime advisory:', error);
      }
    };

    void loadIncidents();
    void loadRealtimeAdvisory();

    const refreshInterval = window.setInterval(() => {
      void loadIncidents();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const quickActions = [
    { label: 'Submit Conduct Form', action: () => navigate('/teacher/conduct-form') },
    { label: 'Review Incident Reports', action: () => navigate('/teacher/incident-reports') },
    { label: 'Open Advisories', action: () => navigate('/teacher/advisories') },
  ];

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Class Safety Command Center</h1>
          <p>
            {getGreeting()}, {user?.firstName}. Track heat alerts, submit forms, and keep class decisions aligned with the latest school safety guidance.
          </p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineThermostat className="teacher-hero-icon" />
          <div>
            <strong>{realtimeAdvisory?.riskLevel?.toUpperCase() || 'DANGER'}</strong>
            <p>
              {realtimeAdvisory?.summary || 'Live heat guidance is loading. Keep hydration and indoor alternatives ready.'}
            </p>
          </div>
        </div>
      </div>

      <div className="teacher-stats-grid">
        {teacherStats.map((stat) => (
          <Card key={stat.label} className="teacher-stat-card">
            <div className="teacher-stat-label">{stat.label}</div>
            <div className="teacher-stat-value">{stat.value}</div>
            <div className="teacher-stat-note">{stat.note}</div>
          </Card>
        ))}
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Today’s Class Safety Brief" className="teacher-panel-card tone-alert">
            <div className="teacher-grid-two">
              <div>
                <div className="teacher-pill-list" style={{ marginBottom: 14 }}>
                  <span className="teacher-pill accent"><MdHealthAndSafety /> Heat safety</span>
                  <span className="teacher-pill"><MdCheckCircle /> Indoor backup</span>
                  <span className="teacher-pill"><MdDateRange /> Updated now</span>
                </div>
                <p className="teacher-info-copy">
                  {realtimeAdvisory?.summary || 'Danger-level heat requires indoor activities, hydration breaks, and early escalation for any symptom reports.'}
                </p>
                <div className="teacher-section-grid" style={{ marginTop: 16 }}>
                  <div className="teacher-info-card">
                    <div className="teacher-info-label">Actions</div>
                    <div className="teacher-info-copy">
                      {(realtimeAdvisory?.actions || [
                        'Postpone strenuous outdoor activity.',
                        'Ensure water access in every classroom.',
                        'Observe students for dizziness, fatigue, or headache.',
                      ]).slice(0, 3).map((item) => <div key={item}>• {item}</div>)}
                    </div>
                  </div>
                  <div className="teacher-info-card">
                    <div className="teacher-info-label">Safety tips</div>
                    <div className="teacher-info-copy">
                      {(realtimeAdvisory?.safetyTips || [
                        'Keep students in shaded or indoor locations.',
                        'Remind hydration every 15 to 20 minutes.',
                        'Escalate repeated symptoms to the clinic.',
                      ]).slice(0, 3).map((item) => <div key={item}>• {item}</div>)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Current heat level</div>
                <div className="teacher-info-value" style={{ textTransform: 'uppercase' }}>{realtimeAdvisory?.riskLevel || 'danger'}</div>
                <div className="teacher-info-copy">
                  Keep this brief visible before class starts. If PE or outdoor work is planned, move it indoors or shorten it.
                </div>
              </div>
            </div>
          </Card>

          <Card title="Recent Incident Queue" className="teacher-panel-card">
            {incidentsLoading ? (
              <div className="teacher-info-copy">Loading recent incidents...</div>
            ) : incidents.length === 0 ? (
              <div className="teacher-info-copy">
                No incidents yet. Use the conduct form if a student shows heat stress, dizziness, headache, or unusual fatigue.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Heat Index</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.slice(0, 3).map((incident) => (
                      <tr key={incident.id}>
                        <td><strong>{incident.studentName || 'Unknown student'}</strong></td>
                        <td>{incident.incidentType}</td>
                        <td><span className={`teacher-status ${String(incident.status).toLowerCase()}`}>{incident.status}</span></td>
                        <td>{typeof incident.heatIndex === 'number' ? `${incident.heatIndex.toFixed(1)}°C` : '—'}</td>
                        <td>{incident.timestamp ? formatDateTimeGlobal(incident.timestamp) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="School Announcements" className="teacher-panel-card">
            {announcementsLoading ? (
              <div className="teacher-info-copy">Loading school announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="teacher-info-copy">No school announcements yet. Teachers can still submit reports and the advisory bot remains available.</div>
            ) : (
              <div className="teacher-section-grid">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="teacher-info-card">
                    <div className="teacher-info-label">{announcement.priority ?? 'info'}</div>
                    <div className="teacher-info-value" style={{ fontSize: 16 }}>{announcement.title}</div>
                    <div className="teacher-info-copy">{announcement.body}</div>
                    <div className="teacher-info-label" style={{ marginTop: 10 }}>
                      {announcement.created_at ? formatDateTimeGlobal(announcement.created_at) : ''}
                    </div>
                  </div>
                ))}
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
          </Card>

          <Card title="Latest Incident" className="teacher-panel-card tone-success">
            {latestIncident ? (
              <div className="teacher-info-copy">
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: 6 }}>{latestIncident.studentName}</strong>
                <div>Type: {latestIncident.incidentType}</div>
                <div>Status: {latestIncident.status}</div>
                <div>Reported by: {latestIncident.reportedBy || latestIncident.reporterName || 'Unknown'}</div>
              </div>
            ) : (
              <div className="teacher-info-copy">No incident data yet. Once available, the most recent class report appears here for quick reference.</div>
            )}
          </Card>

          <Card title="Teacher Notes" className="teacher-panel-card">
            <ul className="teacher-list">
              <li>Use the conduct form for any heat-related observation, even if the student recovers quickly.</li>
              <li>Keep a water bottle, fan, or cool cloth ready in class during danger-level heat.</li>
              <li>Ask the chatbot for direct guidance when you need a short advisory message.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
