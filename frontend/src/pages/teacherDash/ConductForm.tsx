import React, { useMemo, useState } from 'react';
import { MdCheckCircle, MdHealthAndSafety, MdOutlineAssignment, MdOutlineThermostat } from 'react-icons/md';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { createIncident } from '../../services/incidents.service';
import '../../styles/TeacherPanel.css';

const incidentTypes = [
  'heat-exhaustion',
  'asthma-attack',
  'dehydration',
  'dizziness',
  'nausea',
  'headache',
  'other',
] as const;

const ConductForm: React.FC = () => {
  const { user } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [incidentType, setIncidentType] = useState<(typeof incidentTypes)[number]>('heat-exhaustion');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('Moved student to shaded area, gave water, and informed the clinic.');
  const [heatIndex, setHeatIndex] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');

  const teacherName = useMemo(() => `${user?.firstName ?? 'Teacher'} ${user?.lastName ?? ''}`.trim(), [user?.firstName, user?.lastName]);

  const resetForm = () => {
    setStudentName('');
    setStudentId('');
    setGradeLevel('');
    setSection('');
    setIncidentType('heat-exhaustion');
    setDescription('');
    setActionTaken('Moved student to shaded area, gave water, and informed the clinic.');
    setHeatIndex('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage('');

    try {
      const payload = {
        schoolId: user?.schoolId || 'school-1',
        reporterId: user?.id,
        studentId: studentId.trim() || undefined,
        type: incidentType,
        description: [
          `Student: ${studentName || 'Unknown student'}`,
          gradeLevel ? `Grade: ${gradeLevel}` : null,
          section ? `Section: ${section}` : null,
          description.trim() || 'No additional description provided.',
        ].filter(Boolean).join(' | '),
        actionTaken,
        heatIndex: heatIndex.trim() ? Number(heatIndex) : undefined,
      };

      const created = await createIncident(payload);
      setStatusMessage('Conduct form submitted successfully. The report is now visible in incident tracking.');
      resetForm();
      setAiSuggestion(created?.aiSuggestion || '');
    } catch (error) {
      console.error('Failed to create incident:', error);
      setStatusMessage('Unable to submit right now. Please retry once the connection is stable.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Conduct Form</h1>
          <p>
            Log heat-related student conditions quickly and consistently. Use this form as soon as symptoms appear so the clinic and admin can respond.
          </p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineAssignment className="teacher-hero-icon" />
          <div>
            <strong>Submitted by</strong>
            <p>{teacherName}</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Student Condition Report" className="teacher-panel-card">
            <form onSubmit={handleSubmit} className="teacher-form-grid">
              <div className="teacher-form-field">
                <label htmlFor="studentName">Student name</label>
                <input id="studentName" value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Enter student name" />
              </div>
              <div className="teacher-form-field">
                <label htmlFor="studentId">Student ID (optional)</label>
                <input id="studentId" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Student reference ID" />
              </div>
              <div className="teacher-form-field">
                <label htmlFor="gradeLevel">Grade level</label>
                <input id="gradeLevel" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="Grade 1, Grade 5, etc." />
              </div>
              <div className="teacher-form-field">
                <label htmlFor="section">Section</label>
                <input id="section" value={section} onChange={(event) => setSection(event.target.value)} placeholder="Section name" />
              </div>
              <div className="teacher-form-field">
                <label htmlFor="incidentType">Incident type</label>
                <select id="incidentType" value={incidentType} onChange={(event) => setIncidentType(event.target.value as (typeof incidentTypes)[number])}>
                  {incidentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="teacher-form-field">
                <label htmlFor="heatIndex">Heat index at time</label>
                <input id="heatIndex" type="number" step="0.1" value={heatIndex} onChange={(event) => setHeatIndex(event.target.value)} placeholder="e.g. 45.8" />
              </div>
              <div className="teacher-form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="description">Observed symptoms / situation</label>
                <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe symptoms, behavior, and what happened before reporting." />
              </div>
              <div className="teacher-form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="actionTaken">Action taken</label>
                <textarea id="actionTaken" value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} placeholder="What you already did for the student." />
              </div>

              <div className="teacher-form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Conduct Form'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { resetForm(); setAiSuggestion(''); }} disabled={submitting}>
                  Clear
                </button>
              </div>

              {statusMessage && (
                <div className="teacher-sidebar-note" style={{ gridColumn: '1 / -1' }}>
                  {statusMessage}
                </div>
              )}

              {aiSuggestion && (
                <div className="teacher-sidebar-note" style={{ gridColumn: '1 / -1', borderLeft: '4px solid #2563eb' }}>
                  <strong>AI suggestion:</strong> {aiSuggestion}
                </div>
              )}
            </form>
          </Card>

          <Card title="Recommended response steps" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              <div className="teacher-info-card">
                <div className="teacher-info-label">Immediate action</div>
                <div className="teacher-info-copy">Move the student to shade or a cool indoor space, then give water if they are conscious.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Escalation</div>
                <div className="teacher-info-copy">If symptoms continue, inform the clinic and note the heat index, symptoms, and action taken.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label">Documentation</div>
                <div className="teacher-info-copy">Write the report while details are fresh so the head teacher and adviser can follow up quickly.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="What to record" className="teacher-panel-card">
            <ul className="teacher-list">
              <li>Student name, grade, and section.</li>
              <li>Symptoms such as dizziness, headache, nausea, or fatigue.</li>
              <li>Heat index and whether the student was indoors or outdoors.</li>
              <li>Action taken before clinic referral or pick-up.</li>
            </ul>
          </Card>

          <Card title="Heat reminders" className="teacher-panel-card tone-alert">
            <div className="teacher-pill-list">
              <span className="teacher-pill accent"><MdOutlineThermostat /> Danger heat</span>
              <span className="teacher-pill"><MdHealthAndSafety /> Hydration first</span>
              <span className="teacher-pill"><MdCheckCircle /> Report fast</span>
            </div>
            <div className="teacher-sidebar-note" style={{ marginTop: 16 }}>
              Keep the report short, factual, and school-safe. The goal is fast response, not a long narrative.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConductForm;