import React, { useEffect, useMemo, useState } from 'react';
import { MdOutlineLocalHospital, MdSearch } from 'react-icons/md';
import { Card } from '../../components/Card';
import { apiClient } from '../../services/api';
import { fetchIncidents } from '../../services/incidents.service';
import '../../styles/TeacherPanel.css';
import '../../styles/HeadTeacherPanel.css';

const IncidentReview: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'monitoring' | 'treated'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents(50, 0);
      setIncidents(
        data.filter((incident) => {
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
      const searchableText = [incident.studentName, incident.gradeLevel, incident.section, incident.incidentType, incident.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return statusMatch && (!normalized || searchableText.includes(normalized));
    });
  }, [incidents, searchTerm, statusFilter]);

  const handleUpdate = async (id: string, changes: any) => {
    try {
      const { data } = await apiClient.put(`/api/incidents/${id}`, changes);
      const updatedIncident = data.data;

      setIncidents((prev) => {
        if (String(updatedIncident?.status).toLowerCase() === 'resolved') {
          return prev.filter((item) => item.id !== id);
        }

        return prev.map((item) => (item.id === id ? updatedIncident : item));
      });
    } catch (error) {
      console.error(error);
      alert('Update failed');
    }
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
          <p>Review teacher-submitted incident reports, update status, and process student heat cases until resolution.</p>
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
                <li>Resolved should mean the record is closed and no further action is required.</li>
              </ul>
            </Card>
          </div>

          <Card title="Pending Incidents" className="teacher-panel-card">
            <div className="teacher-incidents-toolbar" style={{ marginBottom: 16 }}>
              <label className="teacher-incidents-search">
                <MdSearch />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, grade, section, or type"
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
              <div style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Grade / Section</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Action Taken</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr key={incident.id}>
                        <td style={{ fontWeight: 700 }}>{incident.studentName || incident.id}</td>
                        <td>{[incident.gradeLevel, incident.section].filter(Boolean).join(' - ') || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{incident.incidentType || '—'}</td>
                        <td className="description" title={incident.description || ''}>{incident.description || '—'}</td>
                        <td className="action-taken" title={incident.actionTaken || ''}>{incident.actionTaken || '—'}</td>
                        <td>{incident.status ? <span className={`status-badge ${String(incident.status).toLowerCase()}`}>{incident.status}</span> : '—'}</td>
                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{incident.timestamp ? new Date(incident.timestamp).toLocaleString() : '—'}</td>
                        <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            aria-label="Set incident status"
                            defaultValue={String(incident.status || 'pending')}
                            onChange={(e) => handleUpdate(incident.id, { status: e.target.value })}
                            className="select-field"
                            style={{ padding: '8px 10px', borderRadius: 8 }}
                          >
                            <option value="pending">Pending</option>
                            <option value="monitoring">Monitoring</option>
                            <option value="treated">Treated</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <button onClick={() => handleDelete(incident.id)} className="btn btn-danger">Delete</button>
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
    </div>
  );
};

export default IncidentReview;
