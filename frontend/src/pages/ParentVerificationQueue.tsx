import React, { useEffect, useState } from 'react';
import { MdVerifiedUser, MdCheckCircle, MdCancel } from 'react-icons/md';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import {
  fetchPendingVerifications,
  approveVerification,
  rejectVerification,
  type PendingVerification,
} from '../services/parentVerification.service';
import '../styles/TeacherPanel.css';
import '../styles/HeadTeacherPanel.css';

const ParentVerificationQueue: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchPendingVerifications();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load pending parent verifications:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const keyFor = (r: PendingVerification) => `${r.parentUserId}:${r.studentId}`;

  const handleApprove = async (r: PendingVerification) => {
    setBusyKey(keyFor(r));
    try {
      await approveVerification(r.parentUserId, r.studentId, user?.id);
      setRequests((prev) => prev.filter((item) => keyFor(item) !== keyFor(r)));
    } catch (error) {
      console.error(error);
      alert('Failed to approve request');
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (r: PendingVerification) => {
    const reason = window.prompt('Reason for rejecting this request (optional):');
    if (reason === null) return;

    setBusyKey(keyFor(r));
    try {
      await rejectVerification(r.parentUserId, r.studentId, user?.id, reason || undefined);
      setRequests((prev) => prev.filter((item) => keyFor(item) !== keyFor(r)));
    } catch (error) {
      console.error(error);
      alert('Failed to reject request');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="teacher-page-shell" id="parent-verifications-top">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Staff review</p>
          <h1>Parent Verifications</h1>
          <p>
            New parent accounts wait here until staff confirm the submitted student number actually matches the
            child before the parent can see their reports and messages.
          </p>
        </div>
        <div className="teacher-hero-card">
          <MdVerifiedUser className="teacher-hero-icon" />
          <div>
            <strong>{requests.length}</strong>
            <p>Pending requests</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Pending Requests" className="teacher-panel-card">
            {loading ? (
              <div className="teacher-info-copy">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="teacher-info-copy">No pending parent verification requests.</div>
            ) : (
              <div className="responsive-incident-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="teacher-dashboard-table app-table responsive-incident-table">
                  <thead>
                    <tr>
                      <th>Parent</th>
                      <th>Child</th>
                      <th>Submitted Student #</th>
                      <th>Actual Student #</th>
                      <th>Match</th>
                      <th>ID Photo</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={keyFor(r)}>
                        <td data-label="Parent">
                          <strong>{r.parentName || 'Unknown'}</strong>
                          <div style={{ fontSize: '0.8em', color: '#64748b' }}>{r.parentEmail}</div>
                        </td>
                        <td data-label="Child">
                          {r.studentName || r.studentId}
                          <div style={{ fontSize: '0.8em', color: '#64748b' }}>
                            {[r.gradeLevel, r.section].filter(Boolean).join(' - ')}
                          </div>
                        </td>
                        <td data-label="Submitted Student #">{r.submittedStudentNumber || '—'}</td>
                        <td data-label="Actual Student #">{r.actualStudentNumber || '—'}</td>
                        <td data-label="Match">
                          {r.studentNumberMatches ? (
                            <span className="status-badge resolved">Matches</span>
                          ) : (
                            <span className="status-badge pending">Mismatch</span>
                          )}
                        </td>
                        <td data-label="ID Photo">
                          {r.idPhotoUrl ? (
                            <a href={r.idPhotoUrl} target="_blank" rel="noreferrer">
                              View photo
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td data-label="Requested" style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                          {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '—'}
                        </td>
                        <td data-label="Actions" style={{ whiteSpace: 'nowrap', display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => void handleApprove(r)}
                            disabled={busyKey === keyFor(r)}
                            title="Approve"
                          >
                            <MdCheckCircle /> Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => void handleReject(r)}
                            disabled={busyKey === keyFor(r)}
                            title="Reject"
                          >
                            <MdCancel /> Reject
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
          {/* Sidebar intentionally left empty, matching Incident Review's layout */}
        </div>
      </div>
    </div>
  );
};

export default ParentVerificationQueue;
