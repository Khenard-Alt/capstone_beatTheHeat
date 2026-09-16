import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Pagination } from '../../components/Pagination';
import { fetchAnnouncements, type Announcement } from '../../services/announcements.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/AdminDashboard.css';

const ANNOUNCEMENTS_PAGE_SIZE = 10;

const HeadTeacherPrincipalAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(announcements.length / ANNOUNCEMENTS_PAGE_SIZE));
  const pagedAnnouncements = announcements.slice(
    (page - 1) * ANNOUNCEMENTS_PAGE_SIZE,
    page * ANNOUNCEMENTS_PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
    <div className="admin-dashboard admin-announcements-page">
      <div className="admin-dashboard-header">
        <div>
          <h1>Principal Announcements (Read-only)</h1>
          <p>School-wide announcements published by the principal. Read-only view for head teachers.</p>
        </div>
      </div>

      <div className="admin-announcements-content">
        <Card title="Announcement Feed">
          {loading ? (
            <div>Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="empty-state">No announcements yet</div>
          ) : (
            <div className="admin-announcements-feed">
              {pagedAnnouncements.map((announcement) => (
                <article key={announcement.id} className="admin-announcement-item">
                  <div className="admin-announcement-item-header">
                    <strong>{announcement.title}</strong>
                    <span className="admin-announcement-priority">{announcement.priority ?? 'info'}</span>
                  </div>
                  <p className="admin-announcement-body">{announcement.body}</p>
                  <small className="admin-announcement-date">
                    {announcement.created_at ? formatDateTimeGlobal(announcement.created_at) : ''}
                  </small>
                </article>
              ))}
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={announcements.length}
                pageSize={ANNOUNCEMENTS_PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default HeadTeacherPrincipalAnnouncements;
