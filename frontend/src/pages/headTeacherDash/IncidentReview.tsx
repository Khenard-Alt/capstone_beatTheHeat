import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { fetchIncidents } from '../../services/incidents.service';
import { apiClient } from '../../services/api';
import '../../styles/AdminDashboard.css';

const IncidentReview: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents(50, 0);
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdate = async (id: string, changes: any) => {
    try {
      const { data } = await apiClient.put(`/api/incidents/${id}`, changes);
      setIncidents((prev) => prev.map((i) => (i.id === id ? data.data : i)));
      alert('Updated');
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident?')) return;
    try {
      await apiClient.delete(`/api/incidents/${id}`);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      alert('Deleted');
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Incident Review</h1>
          <p>Review teacher-submitted incident reports and take actions.</p>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <Card title="Pending Incidents">
          {loading ? (
            <div>Loading...</div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">No incidents</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {incidents.map((inc) => (
                <div key={inc.id} style={{ border: '1px solid #e2e8f0', padding: 12, borderRadius: 8, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{inc.studentName || inc.id}</strong>
                    <span>{inc.status}</span>
                  </div>
                  <p style={{ margin: 6 }}>{inc.description}</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => handleUpdate(inc.id, { status: 'monitoring' })} className="btn">Mark Monitoring</button>
                    <button onClick={() => handleUpdate(inc.id, { status: 'treated' })} className="btn btn-primary">Mark Treated</button>
                    <button onClick={() => handleUpdate(inc.id, { status: 'resolved' })} className="btn btn-success">Resolve</button>
                    <button onClick={() => handleDelete(inc.id)} className="btn btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default IncidentReview;
