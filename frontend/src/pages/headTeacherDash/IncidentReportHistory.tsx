import React, { useEffect, useMemo, useState } from 'react';
import { MdHistory, MdSearch } from 'react-icons/md';
import { Card } from '../../components/Card';
import { fetchIncidentHistory, type IncidentHistoryRecord } from '../../services/incidents.service';
import '../../styles/TeacherPanel.css';
import '../../styles/HeadTeacherPanel.css';

const IncidentReportHistory: React.FC = () => {
  const [history, setHistory] = useState<IncidentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchIncidentHistory(100, 0);
        if (mounted) setHistory(data);
      } catch (error) {
        console.error('Failed to load incident history:', error);
        if (mounted) setHistory([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return history;

    return history.filter((incident) => {
      const searchableText = [
        incident.studentName,
        incident.gradeLevel,
        incident.section,
        incident.incidentType,
        incident.description,
        incident.resolvedByName,
        incident.resolutionNotes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalized);
    });
  }, [history, searchTerm]);

  return (
    <div className="teacher-page-shell" id="incident-history-top">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Incident Report History</h1>
          <p>Closed cases that have been resolved, with who resolved them and any follow-up notes.</p>
        </div>
        <div className="teacher-hero-card">
          <MdHistory className="teacher-hero-icon" />
          <div>
            <strong>{filtered.length}</strong>
            <p>Resolved cases</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Resolved Incidents" className="teacher-panel-card">
            <div className="teacher-incidents-toolbar" style={{ marginBottom: 16 }}>
              <label className="teacher-incidents-search">
                <MdSearch />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search student, grade, section, type, or resolver"
                />
              </label>
            </div>

            {loading ? (
              <div className="teacher-info-copy">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="teacher-info-copy">No resolved incidents yet.</div>
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
                      <th>Resolved By</th>
                      <th>Resolution Notes</th>
                      <th>Resolved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((incident) => (
                      <tr key={incident.id}>
                        <td data-label="Student" style={{ fontWeight: 700 }}>{incident.studentName || incident.id}</td>
                        <td data-label="Grade / Section">{[incident.gradeLevel, incident.section].filter(Boolean).join(' - ') || '—'}</td>
                        <td data-label="Incident Type" style={{ textTransform: 'capitalize' }}>{incident.incidentType || '—'}</td>
                        <td data-label="Description" className="description" title={incident.description || ''}>{incident.description || '—'}</td>
                        <td data-label="Action Taken" className="action-taken" title={incident.actionTaken || ''}>{incident.actionTaken || '—'}</td>
                        <td data-label="Resolved By">{incident.resolvedByName || '—'}</td>
                        <td data-label="Resolution Notes" className="description" title={incident.resolutionNotes || ''}>{incident.resolutionNotes || '—'}</td>
                        <td data-label="Resolved At" style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                          {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '—'}
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
          {/* Sidebar intentionally left empty, matching Incident Review's layout */}
        </div>
      </div>
    </div>
  );
};

export default IncidentReportHistory;
