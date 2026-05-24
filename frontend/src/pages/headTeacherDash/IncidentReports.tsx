import React, { useEffect, useMemo, useState } from 'react';
import { MdInfoOutline, MdSearch } from 'react-icons/md';
import { Card } from '../../components/Card';
import { fetchIncidents, type IncidentRecord } from '../../services/incidents.service';
import '../../styles/TeacherPanel.css';
import '../../styles/HeadTeacherPanel.css';

type IncidentDetail = IncidentRecord & {
  parentName?: string | null;
  parentEmail?: string | null;
};

const IncidentReports: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'monitoring' | 'treated' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
        console.error(error);
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
    const normalized = searchTerm.trim().toLowerCase();

    return incidents.filter((incident) => {
      const isTeacherReport = !incident.reporterRole || String(incident.reporterRole).toLowerCase() === 'teacher';
      const statusMatch = statusFilter === 'all' || String(incident.status).toLowerCase() === statusFilter;
      const searchableText = [incident.studentName, incident.gradeLevel, incident.section, incident.incidentType, incident.description, incident.reportedBy, incident.parentName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return isTeacherReport && statusMatch && (!normalized || searchableText.includes(normalized));
    });
  }, [incidents, searchTerm, statusFilter]);

  return (
    <div className="teacher-page-shell" id="incident-reports-top">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Incident Reports</h1>
          <p>Teacher-submitted student incidents stored in the database, ready for processing and follow-up.</p>
        </div>
        <div className="teacher-hero-card">
          <MdInfoOutline className="teacher-hero-icon" />
          <div>
            <strong>{filteredIncidents.length}</strong>
            <p>Visible report rows</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          {/* Report Notes moved from sidebar: keep as standalone card above the reports table */}
          <div style={{ marginBottom: 16 }}>
            <Card title="Report Notes" className="teacher-panel-card tone-success">
              <ul className="teacher-list">
                <li>This report feed is the source of truth for incident history.</li>
                <li>Principal, teachers, parents, and admin pages all read from the same incidents API.</li>
                <li>Use the info button to inspect the full incident details before closing the report.</li>
              </ul>
            </Card>
          </div>

          <Card title="Reports" className="teacher-panel-card">
            <div className="teacher-incidents-toolbar" style={{ marginBottom: 16 }}>
              <label className="teacher-incidents-search">
                <MdSearch />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, grade, section, incident, or reporter"
                />
              </label>

              <select
                className="teacher-incidents-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as any)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="monitoring">Monitoring</option>
                <option value="treated">Treated</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {loading ? (
              <div className="teacher-info-copy">Loading...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="teacher-info-copy">No incident reports found for this filter.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Grade / Section</th>
                      <th>Incident Type</th>
                      <th>Description</th>
                      <th>Action Taken</th>
                      <th>Status</th>
                      <th>Reported By</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr key={incident.id}>
                        <td style={{ fontWeight: 600 }}>{incident.studentName || 'Unknown student'}</td>
                        <td>{[incident.gradeLevel, incident.section].filter(Boolean).join(' - ') || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{incident.incidentType || '—'}</td>
                        <td className="description" style={{ color: '#334155' }} title={incident.description || ''}>{incident.description || '—'}</td>
                        <td className="action-taken" style={{ color: '#334155' }} title={incident.actionTaken || ''}>{incident.actionTaken || '—'}</td>
                        <td>{incident.status ? <span className={`status-badge ${String(incident.status).toLowerCase()}`}>{incident.status}</span> : '—'}</td>
                        <td>{incident.reportedBy || incident.reporterName || '—'}</td>
                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{incident.timestamp ? new Date(incident.timestamp).toLocaleString() : '—'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedIncident(incident)}
                            title="Show info"
                            aria-label={`Show info for ${incident.studentName || 'incident'}`}
                            className="table-action-btn"
                          >
                            <MdInfoOutline size={20} />
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

        <div className="teacher-side">
          {/* Sidebar intentionally left empty for incident reports; notes moved above table */}
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
              <InfoBlock label="Heat Index" value={typeof selectedIncident.heatIndex === 'number' ? `${selectedIncident.heatIndex.toFixed(1)}°C` : '—'} />
            </div>

            <div style={{ padding: '0 20px 20px', display: 'grid', gap: 12 }}>
              <InfoSection label="Description" value={selectedIncident.description || '—'} />
              <InfoSection label="Action Taken" value={selectedIncident.actionTaken || '—'} />
              <InfoSection label="AI Suggestion" value={selectedIncident.aiSuggestion || '—'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

export default IncidentReports;
