import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { fetchIncidents, type IncidentRecord } from '../../services/incidents.service';
import { MdInfoOutline } from 'react-icons/md';
import '../../styles/AdminDashboard.css';

type IncidentDetail = IncidentRecord & {
  parentName?: string | null;
  parentEmail?: string | null;
};

const IncidentReports: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchIncidents(50, 0);
        if (mounted) setIncidents(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Incident Reports</h1>
          <p>All student incidents reported by teachers and stored in the database.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Reports">
          {loading ? (
            <div>Loading...</div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">No incident reports</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px' }}>Student</th>
                    <th style={{ padding: '12px 8px' }}>Grade / Section</th>
                    <th style={{ padding: '12px 8px' }}>Incident Type</th>
                    <th style={{ padding: '12px 8px' }}>Description</th>
                    <th style={{ padding: '12px 8px' }}>Action Taken</th>
                    <th style={{ padding: '12px 8px' }}>Heat Index</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Reported By</th>
                    <th style={{ padding: '12px 8px' }}>Date</th>
                    <th style={{ padding: '12px 8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => (
                    <tr key={inc.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{inc.studentName || 'Unknown student'}</td>
                      <td style={{ padding: '12px 8px' }}>{[inc.gradeLevel, inc.section].filter(Boolean).join(' - ') || '—'}</td>
                      <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>{inc.incidentType || '—'}</td>
                      <td style={{ padding: '12px 8px', color: '#334155', maxWidth: 260 }}>{inc.description || '—'}</td>
                      <td style={{ padding: '12px 8px', color: '#334155', maxWidth: 260 }}>{inc.actionTaken || '—'}</td>
                      <td style={{ padding: '12px 8px' }}>{typeof inc.heatIndex === 'number' ? `${inc.heatIndex.toFixed(1)}°C` : '—'}</td>
                      <td style={{ padding: '12px 8px' }}>{inc.status || '—'}</td>
                      <td style={{ padding: '12px 8px' }}>{inc.reportedBy || inc.reporterName || '—'}</td>
                      <td style={{ padding: '12px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>{inc.timestamp ? new Date(inc.timestamp).toLocaleString() : '—'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(inc)}
                          title="Show info"
                          aria-label={`Show info for ${inc.studentName || 'incident'}`}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#1d4ed8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
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
