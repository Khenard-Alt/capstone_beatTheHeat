import React, { useEffect, useMemo, useState } from 'react';
import { MdInfoOutline, MdOutlineAssignment } from 'react-icons/md';
import { Card } from '../../components/Card';
import { TeacherHeatReminder } from '../../components/TeacherHeatReminder';
import { fetchIncidents, createIncident, type IncidentRecord } from '../../services/incidents.service';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import '../../styles/TeacherPanel.css';

const statusOrder = ['pending', 'monitoring', 'treated', 'resolved'];
const LOG_PAGE_SIZE = 10;

interface StudentOption {
  id: string;
  name: string;
  grade?: string;
  section?: string;
}

const IncidentReports: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | IncidentRecord['status']>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [incidentType, setIncidentType] = useState('heat-exhaustion');
  const [otherTypeDetail, setOtherTypeDetail] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('Moved student to shaded area, gave water, and informed the clinic.');
  const [heatIndex, setHeatIndex] = useState('');

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => {
      const haystack = [student.name, student.grade, student.section].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [students, studentSearch]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents(50, 0);
      setIncidents(data);
    } catch (error) {
      console.error('Failed to load teacher incidents:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await loadIncidents();
      if (!mounted) {
        return;
      }

      try {
        const { data } = await apiClient.get('/api/students');
        if (mounted) {
          setStudents(data.students ?? []);
        }
      } catch (error) {
        console.error('Failed to load class roster:', error);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudentId) {
      setSubmitMessage('Please select a student before submitting.');
      return;
    }
    if (!description.trim()) {
      setSubmitMessage('Please provide incident details before submitting.');
      return;
    }
    if (incidentType === 'other' && !otherTypeDetail.trim()) {
      setSubmitMessage('Please specify the incident type.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage('');

      await createIncident({
        schoolId: user?.schoolId || 'school-1',
        reporterId: user?.id,
        studentId: selectedStudentId,
        type: incidentType,
        description: [
          `Student: ${selectedStudent?.name || 'Unknown student'}`,
          incidentType === 'other' ? `Type specified: ${otherTypeDetail.trim()}` : '',
          description.trim(),
        ].filter(Boolean).join(' | '),
        actionTaken: actionTaken.trim() || undefined,
        heatIndex: heatIndex.trim() ? Number(heatIndex) : undefined,
      });

      setSelectedStudentId('');
      setStudentSearch('');
      setIncidentType('heat-exhaustion');
      setOtherTypeDetail('');
      setDescription('');
      setActionTaken('Moved student to shaded area, gave water, and informed the clinic.');
      setHeatIndex('');
      setSubmitMessage('Incident submitted. Head teacher can now process this case in Incident Review.');
      await loadIncidents();
    } catch (error) {
      console.error('Failed to create incident:', error);
      setSubmitMessage('Unable to submit incident right now. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    const query = logSearch.trim().toLowerCase();

    return incidents.filter((incident) => {
      const statusMatch = selectedStatus === 'all' || String(incident.status).toLowerCase() === selectedStatus;
      if (!statusMatch) return false;
      if (!query) return true;

      const haystack = [
        incident.studentName,
        incident.gradeLevel,
        incident.section,
        incident.incidentType,
        incident.description,
        incident.status,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [incidents, selectedStatus, logSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / LOG_PAGE_SIZE));

  const pagedIncidents = useMemo(() => {
    const start = (logPage - 1) * LOG_PAGE_SIZE;
    return filteredIncidents.slice(start, start + LOG_PAGE_SIZE);
  }, [filteredIncidents, logPage]);

  useEffect(() => {
    setLogPage(1);
  }, [logSearch, selectedStatus]);

  useEffect(() => {
    if (logPage > totalPages) {
      setLogPage(totalPages);
    }
  }, [logPage, totalPages]);

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
          <p>Track class incidents and keep a fast response trail for heat-related events.</p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineAssignment className="teacher-hero-icon" />
          <div>
            <strong>{stats.total} records</strong>
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
          <Card title="Create Incident Report" className="teacher-panel-card tone-alert">
            <form onSubmit={handleCreateIncident} className="teacher-form-grid">
              <div className="teacher-form-field" style={{ position: 'relative' }}>
                <label htmlFor="incidentStudentSearch">Student</label>
                <input
                  id="incidentStudentSearch"
                  value={selectedStudent ? `${selectedStudent.name}${selectedStudent.grade ? ` — ${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ''}` : ''}` : studentSearch}
                  onChange={(event) => {
                    setSelectedStudentId('');
                    setStudentSearch(event.target.value);
                    setStudentDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (selectedStudentId) {
                      setSelectedStudentId('');
                      setStudentSearch('');
                    }
                    setStudentDropdownOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 150)}
                  placeholder="Search student by name, grade, or section"
                  autoComplete="off"
                />
                {studentDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      maxHeight: 220,
                      overflowY: 'auto',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
                      marginTop: 4,
                      color: '#1e293b',
                    }}
                  >
                    {filteredStudents.length === 0 ? (
                      <div style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>No matching students.</div>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          type="button"
                          key={student.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setStudentSearch('');
                            setStudentDropdownOpen(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 13,
                            color: '#1e293b',
                          }}
                        >
                          <strong>{student.name}</strong>
                          {student.grade ? (
                            <span style={{ color: '#64748b' }}> — {student.grade}{student.section ? ` ${student.section}` : ''}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="teacher-form-field">
                <label htmlFor="incidentGradeSection">Grade &amp; section</label>
                <input
                  id="incidentGradeSection"
                  value={
                    selectedStudent
                      ? [selectedStudent.grade, selectedStudent.section].filter(Boolean).join(' - ') || 'Not on record'
                      : ''
                  }
                  placeholder="Auto-filled from selected student"
                  readOnly
                  disabled
                />
              </div>
              <div className="teacher-form-field">
                <label htmlFor="incidentType">Incident type</label>
                <select id="incidentType" value={incidentType} onChange={(event) => setIncidentType(event.target.value)}>
                  <option value="heat-exhaustion">Heat Exhaustion</option>
                  <option value="dehydration">Dehydration</option>
                  <option value="dizziness">Dizziness</option>
                  <option value="nausea">Nausea</option>
                  <option value="headache">Headache</option>
                  <option value="asthma-attack">Asthma Attack</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {incidentType === 'other' && (
                <div className="teacher-form-field">
                  <label htmlFor="incidentOtherDetail">Please specify</label>
                  <input
                    id="incidentOtherDetail"
                    value={otherTypeDetail}
                    onChange={(event) => setOtherTypeDetail(event.target.value)}
                    placeholder="Describe the incident type"
                  />
                </div>
              )}
              <div className="teacher-form-field">
                <label htmlFor="incidentHeatIndex">Heat index at time</label>
                <input
                  id="incidentHeatIndex"
                  type="number"
                  step="0.1"
                  value={heatIndex}
                  onChange={(event) => setHeatIndex(event.target.value)}
                  placeholder="e.g. 43.2"
                />
              </div>
              <div className="teacher-form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="incidentDescription">Observed symptoms / situation</label>
                <textarea
                  id="incidentDescription"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe what happened and the student's condition"
                />
              </div>
              <div className="teacher-form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="incidentActionTaken">Action taken</label>
                <textarea
                  id="incidentActionTaken"
                  value={actionTaken}
                  onChange={(event) => setActionTaken(event.target.value)}
                  placeholder="What immediate response was done"
                />
              </div>
              <div className="teacher-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit for Head Teacher Review'}
                </button>
              </div>
              {submitMessage && (
                <div className="teacher-sidebar-note" style={{ gridColumn: '1 / -1' }}>
                  {submitMessage}
                </div>
              )}
            </form>
          </Card>

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

            <div className="teacher-form-field" style={{ marginBottom: 16 }}>
              <input
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="Search by student, grade, section, type, or description"
                aria-label="Search incident log"
              />
            </div>

            {loading ? (
              <div className="teacher-info-copy">Loading incident records...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="teacher-info-copy">
                No incident reports found for this filter. Use the form above to add a class report when symptoms are observed.
              </div>
            ) : (
              <>
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
                      {pagedIncidents.map((incident) => (
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

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <span className="teacher-info-copy" style={{ fontSize: 13 }}>
                    Showing {(logPage - 1) * LOG_PAGE_SIZE + 1}–{Math.min(logPage * LOG_PAGE_SIZE, filteredIncidents.length)} of {filteredIncidents.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setLogPage((page) => Math.max(1, page - 1))}
                      disabled={logPage === 1}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`teacher-pill ${logPage === page ? 'accent' : ''}`}
                        onClick={() => setLogPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setLogPage((page) => Math.min(totalPages, page + 1))}
                      disabled={logPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>

        </div>

        <div className="teacher-side">
          <TeacherHeatReminder
            title="Heat check"
            extra={
              <div className="teacher-sidebar-note" style={{ marginTop: 10 }}>
                Repeated reports in one class? Notify the head teacher and clinic immediately so they can coordinate a schedule change.
              </div>
            }
          />

          <Card title="Response steps" className="teacher-panel-card tone-success">
            <p className="teacher-info-copy">
              Move the student to shade, give water, and inform the clinic — then log the details above so the head
              teacher and adviser can follow up quickly.
            </p>
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