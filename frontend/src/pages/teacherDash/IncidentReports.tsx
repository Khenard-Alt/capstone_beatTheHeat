import React, { useEffect, useMemo, useState } from 'react';
import { MdInfoOutline, MdOutlineAssignment, MdOutlineThermostat } from 'react-icons/md';
import { Card } from '../../components/Card';
import { fetchIncidents, type IncidentRecord } from '../../services/incidents.service';
import '../../styles/TeacherPanel.css';

const statusOrder = ['pending', 'monitoring', 'treated', 'resolved'];

const IncidentReports: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | IncidentRecord['status']>('all');
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchIncidents(50, 0);
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
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredIncidents = useMemo(() => {
    if (selectedStatus === 'all') {
      return incidents;
    }

    return incidents.filter((incident) => String(incident.status).toLowerCase() === selectedStatus);
  }, [incidents, selectedStatus]);

  const stats = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter((incident) => String(incident.status).toLowerCase() === 'pending').length,
    monitoring: incidents.filter((incident) => String(incident.status).toLowerCase() === 'monitoring').length,
    resolved: incidents.filter((incident) => String(incident.status).toLowerCase() === 'resolved').length,
  }), [incidents]);

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Incident Reports</h1>
          <p>Track class incidents, review timestamps, and keep a fast response trail for heat-related events.</p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineAssignment className="teacher-hero-icon" />
          <div>
            <strong>{stats.total} records</strong>
            <p>Current incident queue for the teacher panel.</p>
          </div>
        </div>
      </div>

      <div className="teacher-stats-grid">
        {[
          { label: 'Total Reports', value: stats.total, note: 'Loaded from database' },
          { label: 'Pending', value: stats.pending, note: 'Needs attention' },
          { label: 'Monitoring', value: stats.monitoring, note: 'Follow-up in progress' },
          { label: 'Resolved', value: stats.resolved, note: 'Closed by staff' },
        ].map((stat) => (
          <Card key={stat.label} className="teacher-stat-card">
            <div className="teacher-stat-label">{stat.label}</div>
            <div className="teacher-stat-value">{stat.value}</div>
            <div className="teacher-stat-note">{stat.note}</div>
          </Card>
        ))}
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Incident Log" className="teacher-panel-card">
            <div className="teacher-pill-list" style={{ marginBottom: 16 }}>
              {(['all', ...statusOrder] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`teacher-pill ${selectedStatus === status ? 'accent' : ''}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="teacher-info-copy">Loading incident records...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="teacher-info-copy">
                No incident reports found for this filter. Use the conduct form to add a class report when symptoms are observed.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr key={incident.id}>
                        <td>
                          <strong>{incident.studentName}</strong>
                          <div className="teacher-info-copy" style={{ marginTop: 4, fontSize: 12 }}>
                            {incident.gradeLevel || 'N/A'} {incident.section ? `• ${incident.section}` : ''}
                          </div>
                        </td>
                        <td>{incident.incidentType}</td>
                        <td style={{ maxWidth: 320 }}>{incident.description || '—'}</td>
                        <td style={{ maxWidth: 300 }}>{incident.actionTaken || '—'}</td>
                        <td><span className={`teacher-status ${String(incident.status).toLowerCase()}`}>{incident.status}</span></td>
                        <td>{incident.timestamp ? new Date(incident.timestamp).toLocaleString() : '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setSelectedIncident(incident)}
                            aria-label={`Show info for ${incident.studentName}`}
                          >
                            <MdInfoOutline />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Incident handling guide" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              <div className="teacher-info-card">
                <div className="teacher-info-label">Observe</div>
                <div className="teacher-info-copy">Watch for dizziness, heavy sweating, headache, nausea, or confusion during hot periods.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Move</div>
                <div className="teacher-info-copy">Move the student away from direct heat, then give water and notify the clinic if symptoms persist.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Document</div>
                <div className="teacher-info-copy">Log the details immediately so the school can respond and follow up quickly.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="Heat check" className="teacher-panel-card tone-alert">
            <div className="teacher-pill-list">
              <span className="teacher-pill accent"><MdOutlineThermostat /> Danger level heat</span>
              <span className="teacher-pill">Keep classes indoor</span>
            </div>
            <div className="teacher-sidebar-note" style={{ marginTop: 16 }}>
              If you see repeated reports in one class, notify the head teacher and clinic immediately so they can coordinate a schedule change.
            </div>
          </Card>

          <Card title="Quick recap" className="teacher-panel-card">
            <ul className="teacher-list">
              <li>Open the info panel to review the full report.</li>
              <li>Use status chips to spot unresolved cases.</li>
              <li>Check the conduct form after every heat-related incident.</li>
            </ul>
          </Card>
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
              borderRadius: 18,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>Incident Information</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>{selectedIncident.studentName}</p>
              </div>
              <button type="button" onClick={() => setSelectedIncident(null)} className="btn btn-secondary">
                Close
              </button>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {[
                ['Student', selectedIncident.studentName],
                ['Grade / Section', [selectedIncident.gradeLevel, selectedIncident.section].filter(Boolean).join(' - ') || '—'],
                ['Reported By', selectedIncident.reportedBy || selectedIncident.reporterName || '—'],
                ['Status', selectedIncident.status],
                ['Incident Type', selectedIncident.incidentType],
                ['Heat Index', typeof selectedIncident.heatIndex === 'number' ? `${selectedIncident.heatIndex.toFixed(1)}°C` : '—'],
                ['Parent Name', selectedIncident.parentName || '—'],
                ['Parent Email', selectedIncident.parentEmail || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="teacher-info-card">
                  <div className="teacher-info-label">{label as string}</div>
                  <div className="teacher-info-value" style={{ fontSize: 16 }}>{value as string}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 20px 20px', display: 'grid', gap: 12 }}>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Description</div>
                <div className="teacher-info-copy">{selectedIncident.description || '—'}</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Action Taken</div>
                <div className="teacher-info-copy">{selectedIncident.actionTaken || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentReports;