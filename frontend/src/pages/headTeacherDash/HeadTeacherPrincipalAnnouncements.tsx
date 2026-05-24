import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { fetchAnnouncements, type Announcement } from '../../services/announcements.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/AdminDashboard.css';

const HeadTeacherPrincipalAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchAnnouncements(50, 0);
        if (mounted) setAnnouncements(data);
      } catch (error) {
        console.error('Failed to load principal announcements (read-only):', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <div className="admin-dashboard-header">
        <div>
          <h1>Principal Announcements (Read-only)</h1>
          <p>School-wide announcements published by the principal. Read-only view for head teachers.</p>
        </div>
      </div>

      <div style={{ padding: 16, paddingTop: 0 }}>
        <Card title="Announcement Feed">
          {loading ? (
            <div>Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="empty-state">No announcements yet</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {announcements.map((announcement) => (
                <article key={announcement.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <strong>{announcement.title}</strong>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{announcement.priority ?? 'info'}</span>
                  </div>
                  <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{announcement.body}</p>
                  <small style={{ display: 'block', marginTop: 10, color: '#64748b' }}>
                    {announcement.created_at ? formatDateTimeGlobal(announcement.created_at) : ''}
                  </small>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default HeadTeacherPrincipalAnnouncements;
