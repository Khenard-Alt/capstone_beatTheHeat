import React, { useEffect, useMemo, useState } from 'react';
import { MdOutlineLocalHospital, MdSearch, MdInfoOutline } from 'react-icons/md';
import { Card } from '../../components/Card';
import { apiClient } from '../../services/api';
import { fetchIncidents } from '../../services/incidents.service';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/TeacherPanel.css';
import '../../styles/HeadTeacherPanel.css';

const IncidentReview: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'monitoring' | 'treated'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [resolutionIncident, setResolutionIncident] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [studentCleared, setStudentCleared] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents(50, 0);
      setIncidents(
        data.filter((incident) => {
          // Resolved incidents move to incident_history on the backend the
          // moment they're resolved, so nothing here is ever actually
          // 'resolved' — this guard just protects against any stale row.
          const isUnresolved = String(incident.status).toLowerCase() !== 'resolved';
          const isTeacherReport = !incident.reporterRole || String(incident.reporterRole).toLowerCase() === 'teacher';
          return isUnresolved && isTeacherReport;
        })
      );
    } catch (error) {
      console.error(error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredIncidents = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return incidents.filter((incident) => {
      const statusMatch = statusFilter === 'all' || String(incident.status).toLowerCase() === statusFilter;
      const searchableText = [
        incident.studentName,
        incident.gradeLevel,
        incident.section,
        incident.incidentType,
        incident.description,
        incident.reportedBy,
        incident.parentName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return statusMatch && (!normalized || searchableText.includes(normalized));
    });
  }, [incidents, searchTerm, statusFilter]);

  const handleUpdate = async (id: string, changes: any) => {
    try {
      const { data } = await apiClient.put(`/api/incidents/${id}`, changes);

      if (data?.moved) {
        // Resolving moves the row into incident_history on the backend —
        // it no longer exists in the active incidents table.
        setIncidents((prev) => prev.filter((item) => item.id !== id));
        return;
      }

      const updatedIncident = data?.data;
      if (!updatedIncident?.id) {
        // Unexpected response shape — refetch instead of silently dropping
        // or leaving the row in a stale state.
        await load();
        return;
      }

      setIncidents((prev) => prev.map((item) => (item.id === id ? updatedIncident : item)));
    } catch (error) {
      console.error(error);
      alert('Update failed');
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    if (status === 'resolved') {
      const incident = incidents.find((item) => item.id === id);
      if (!incident) return;

      setResolutionIncident(incident);
      setResolutionNotes('');
      setStudentCleared(false);
      return;
    }

    void handleUpdate(id, { status });
  };

  const cancelResolution = () => {
    setResolutionIncident(null);
    setResolutionNotes('');
    setStudentCleared(false);
  };

  const confirmResolution = () => {
    if (!resolutionIncident || !studentCleared) return;

    void handleUpdate(resolutionIncident.id, {
      status: 'resolved',
      resolvedBy: user?.id,
      resolutionNotes: resolutionNotes.trim(),
    });
    cancelResolution();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident?')) return;

    try {
      await apiClient.delete(`/api/incidents/${id}`);
      setIncidents((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert('Delete failed');
    }
  };

  return (
    <div className="teacher-page-shell" id="incident-review-top">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Incident Review</h1>
          <p>Review teacher-submitted incident reports, inspect full details, update status, and process student heat cases until resolution.</p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineLocalHospital className="teacher-hero-icon" />
          <div>
            <strong>{filteredIncidents.length}</strong>
            <p>Visible incident rows</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          {/* Review Notes moved from sidebar: keep as standalone card above the pending incidents table */}
          <div style={{ marginBottom: 16 }}>
            <Card title="Review Notes" className="teacher-panel-card tone-success">
              <ul className="teacher-list">
                <li>Use monitoring when the student is stable but still needs follow-up.</li>
                <li>Mark treated only after the immediate classroom response is complete.</li>
                <li>Resolved should mean the record is closed and no further action is required — it moves to Incident History.</li>
                <li>Use the info button to inspect the full incident details, including the parent's contact info.</li>
              </ul>
            </Card>
          </div>

          <Card title="Incidents" className="teacher-panel-card">
            <div className="teacher-incidents-toolbar" style={{ marginBottom: 16 }}>
              <label className="teacher-incidents-search">
                <MdSearch />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, grade, section, type, or reporter"
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
              </select>
            </div>

            {loading ? (
              <div className="teacher-info-copy">Loading...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="teacher-info-copy">No incidents match the current filter.</div>
            ) : (
              <div className="responsive-incident-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table responsive-incident-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Grade / Section</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Action Taken</th>
                      <th>Status</th>
                      <th>Reported By</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr key={incident.id}>
                        <td data-label="Student" style={{ fontWeight: 700 }}>{incident.studentName || incident.id}</td>
                        <td data-label="Grade / Section">{[incident.gradeLevel, incident.section].filter(Boolean).join(' - ') || '—'}</td>
                        <td data-label="Incident Type" style={{ textTransform: 'capitalize' }}>{incident.incidentType || '—'}</td>
                        <td data-label="Description" className="description" title={incident.description || ''}>{incident.description || '—'}</td>
                        <td data-label="Action Taken" className="action-taken" title={incident.actionTaken || ''}>{incident.actionTaken || '—'}</td>
                        <td data-label="Status">{incident.status ? <span className={`status-badge ${String(incident.status).toLowerCase()}`}>{incident.status}</span> : '—'}</td>
                        <td data-label="Reported By">{incident.reportedBy || incident.reporterName || '—'}</td>
                        <td data-label="Date" style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{incident.timestamp ? new Date(incident.timestamp).toLocaleString() : '—'}</td>
                        <td data-label="Actions" className="incident-actions-cell">
                          <select
                            aria-label="Set incident status"
                            value={String(incident.status || 'pending')}
                            onChange={(e) => handleStatusChange(incident.id, e.target.value)}
                            className="select-field"
                            
                          >
                            <option value="pending">Pending</option>
                            <option value="monitoring">Monitoring</option>
                            <option value="treated">Treated</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <span className="incident-action-controls">
                            <button
                              type="button"
                              onClick={() => setSelectedIncident(incident)}
                              title="Show info"
                              aria-label={`Show info for ${incident.studentName || 'incident'}`}
                              className="table-action-btn"
                            >
                              <MdInfoOutline size={20} />
                            </button>
                            <button onClick={() => handleDelete(incident.id)} className="btn btn-danger">Delete</button>
                          </span>
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
          {/* Sidebar intentionally left empty for incident review; notes moved above table */}
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

      {resolutionIncident && (
        <div
          className="resolution-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolution-modal-title"
          onClick={cancelResolution}
        >
          <div className="resolution-modal" onClick={(event) => event.stopPropagation()}>
            <div className="resolution-modal-header">
              <div>
                <p className="resolution-modal-eyebrow">Release confirmation</p>
                <h2 id="resolution-modal-title">Is the student okay to be released?</h2>
              </div>
              <button type="button" className="resolution-modal-close" onClick={cancelResolution} aria-label="Close release confirmation">
                &times;
              </button>
            </div>

            <div className="resolution-modal-body">
              <p>
                You are about to resolve the incident for <strong>{resolutionIncident.studentName || 'this student'}</strong>.
                Confirm that the student is stable, has received the needed care, and is safe to be released from this incident.
              </p>

              <label className="resolution-confirmation-check">
                <input
                  type="checkbox"
                  checked={studentCleared}
                  onChange={(event) => setStudentCleared(event.target.checked)}
                />
                <span>I confirm that the student is okay and cleared for release.</span>
              </label>

              <label className="resolution-notes-field">
                <span>Resolution notes <small>(optional)</small></span>
                <textarea
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                  placeholder="Add any final care or release details"
                  rows={3}
                />
              </label>
            </div>

            <div className="resolution-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelResolution}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={confirmResolution} disabled={!studentCleared}>
                Release Student
              </button>
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

export default IncidentReview;
