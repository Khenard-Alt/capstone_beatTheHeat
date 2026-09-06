import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { apiClient } from '../../services/api';
import { fetchIncidents, type IncidentRecord } from '../../services/incidents.service';
import { fetchHealthAdvisories, type LoggedAdvisory } from '../../services/healthAdvisory.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/AdminDashboard.css';

type PrincipalStats = {
  activeAdvisories: number;
  incidents: number;
  activeUsers: number;
  trend: Array<{ timestamp: string; count: number }>;
};

type IncidentRow = IncidentRecord;

const PrincipalReports: React.FC = () => {
  const [stats, setStats] = useState<PrincipalStats | null>(null);
  const [advisories, setAdvisories] = useState<LoggedAdvisory[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const [statsRes, advisoriesRes, incidentsRes] = await Promise.all([
          apiClient.get('/api/principal/stats', { params: { period: 'month' } }),
          fetchHealthAdvisories(8, 0),
          fetchIncidents(8, 0),
        ]);

        if (!mounted) return;

        if (statsRes.data?.success) {
          setStats(statsRes.data.stats ?? null);
        }

        setAdvisories(advisoriesRes);
        setIncidents(incidentsRes);
      } catch (error) {
        console.error('Failed to load principal reports:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const overviewCards = [
    { label: 'Active Advisories', value: stats?.activeAdvisories ?? advisories.length },
    { label: 'Heat Incidents', value: stats?.incidents ?? incidents.length },
    { label: 'Active Users', value: stats?.activeUsers ?? 0 },
    { label: 'Report Rows', value: (stats?.activeAdvisories ?? advisories.length) + (stats?.incidents ?? incidents.length) },
  ];

  return (
    <>
      <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Overall Reports</h1>
          <p>Monthly school report overview for principals, including advisories, incidents, and generated summaries.</p>
        </div>
      </div>

      <div className="admin-dashboard-stats">
        {overviewCards.map((card) => (
          <Card key={card.label} className="admin-stat-card">
            <div className="admin-stat-label">{card.label}</div>
            <div className="admin-stat-value">{loading ? '...' : card.value}</div>
            <div className="admin-stat-note">Monthly scope</div>
          </Card>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-main">
          <Card title="Report Highlights">
            <div style={{ padding: 12, display: 'grid', gap: 10 }}>
              <div>
                <strong>Current focus:</strong> heat-related incidents and advisory volume.
              </div>
              <div>
                <strong>Trend data:</strong> {stats?.trend?.length ?? 0} points available.
              </div>
              <div>
                <strong>Recommendation:</strong> review daily advisories and coordinate with head teachers for incident follow-up.
              </div>
            </div>
          </Card>

          <Card title="Active Advisories">
            {advisories.length === 0 ? (
              <div className="empty-state">No active advisories available</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {advisories.map((advisory) => (
                  <article key={advisory.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <strong>{advisory.decision_basis?.heatLevel ? `Heat Level: ${advisory.decision_basis.heatLevel}` : 'Advisory'}</strong>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{advisory.created_at ? formatDateTimeGlobal(advisory.created_at) : ''}</span>
                    </div>
                    <p style={{ margin: '8px 0 0', color: '#334155', whiteSpace: 'pre-line' }}>{advisory.response}</p>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card title="Incident Reports">
            {incidents.length === 0 ? (
              <div className="empty-state">No incident reports available</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 8px' }}>Student</th>
                      <th style={{ padding: '12px 8px' }}>Incident Type</th>
                      <th style={{ padding: '12px 8px' }}>Description</th>
                      <th style={{ padding: '12px 8px' }}>Action Taken</th>
                      <th style={{ padding: '12px 8px' }}>Status</th>
                      <th style={{ padding: '12px 8px' }}>Date</th>
                      <th style={{ padding: '12px 8px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr key={incident.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{incident.studentName || 'Unknown student'}</td>
                        <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>{incident.incidentType || '—'}</td>
                        <td style={{ padding: '12px 8px', color: '#334155', maxWidth: 240 }}>{incident.description || '—'}</td>
                        <td style={{ padding: '12px 8px', color: '#334155', maxWidth: 240 }}>{incident.actionTaken || '—'}</td>
                        <td style={{ padding: '12px 8px' }}>{incident.status || '—'}</td>
                        <td style={{ padding: '12px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>{incident.timestamp ? formatDateTimeGlobal(incident.timestamp) : '—'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedIncident(incident)}
                            className="btn btn-primary"
                          >
                            View info
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="admin-dashboard-side">
          <Card title="Action Items">
            <div className="principal-actions" style={{ display: 'grid', gap: 8 }}>
              <div className="empty-state" style={{ margin: 0 }}>Review incident trends</div>
              <div className="empty-state" style={{ margin: 0 }}>Send announcements to parents and teachers</div>
              <div className="empty-state" style={{ margin: 0 }}>Coordinate follow-up with head teachers</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
      {selectedIncident && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedIncident(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(720px, 100%)',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>Incident Information</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>{selectedIncident.studentName || 'Unknown student'}</p>
              </div>
              <button type="button" onClick={() => setSelectedIncident(null)} className="btn btn-secondary">
                Close
              </button>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <InfoBlock label="Student" value={selectedIncident.studentName || '—'} />
              <InfoBlock label="Grade / Section" value={[selectedIncident.gradeLevel, selectedIncident.section].filter(Boolean).join(' - ') || '—'} />
              <InfoBlock label="Reported By Teacher" value={selectedIncident.reportedBy || selectedIncident.reporterName || '—'} />
              <InfoBlock label="Parent" value={selectedIncident.parentName || '—'} />
              <InfoBlock label="Parent Email" value={selectedIncident.parentEmail || '—'} />
              <InfoBlock label="Status" value={selectedIncident.status || '—'} />
              <InfoBlock label="Incident Type" value={selectedIncident.incidentType || '—'} />
            </div>

            <div style={{ padding: '0 20px 20px', display: 'grid', gap: 12 }}>
              <InfoSection label="Description" value={selectedIncident.description || '—'} />
              <InfoSection label="Action Taken" value={selectedIncident.actionTaken || '—'} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PrincipalReports;

const InfoBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
    <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    <div style={{ marginTop: 6, color: '#0f172a', fontWeight: 600 }}>{value}</div>
  </div>
);

const InfoSection: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
    <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    <div style={{ marginTop: 8, color: '#0f172a', lineHeight: 1.6 }}>{value}</div>
  </div>
);
