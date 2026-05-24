import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ParentSectionPage } from './ParentSectionPage';
import { fetchParentMessages, sendParentMessage } from '../../services/parentMessages.service';
import type { ParentMessage } from '../../services/parentMessages.service';
import { fetchUsersByRole, type AppUser } from '../../services/users.service';
import '../../styles/ParentQuestionsConcerns.css';

export const ParentQuestionsConcerns: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const currentParentId = user?.id ?? 'parent-1';

  const teacherOptions = useMemo(() => teachers, [teachers]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [messageData, teacherData] = await Promise.all([
          fetchParentMessages(10, 0),
          fetchUsersByRole('teacher'),
        ]);

        if (mounted) {
          setMessages(messageData.filter((message) => !user?.id || message.parent_user_id === user.id));
          setTeachers(teacherData);
          setSelectedTeacherId((current) => current || teacherData[0]?.id || '');
        }
      } catch (err) {
        // ignore
      }
    };
    void load();
    return () => { mounted = false; };
  }, [user?.id]);

  const recipientTeacher = useMemo(() => teachers.find((teacher) => teacher.id === selectedTeacherId) ?? teachers[0], [selectedTeacherId, teachers]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || !recipientTeacher) return;
    try {
      const created = await sendParentMessage({
        parentUserId: currentParentId,
        teacherUserId: recipientTeacher.id,
        studentId: null,
        subject: subject.trim(),
        body: body.trim(),
      });
      setMessages((prev) => [created, ...prev]);
      setSubject('');
      setBody('');
    } catch (err) {
      console.error('Send message failed', err);
    }
  };
  return (
    <>
      <ParentSectionPage
        topId="question-and-concern-top"
        eyebrow="Parent Support"
        title="Questions and Concerns"
        description="A place for parents to review the most common heat-safety questions, check what to report, and understand where to escalate issues."
        summary="This section keeps parent concerns focused on school heat safety, student well-being, and the correct channel for feedback."
        highlights={[
          { label: 'Open concern types', value: 'Heat, health, schedule, safety' },
          { label: 'Response mode', value: 'Guided and scoped' },
          { label: 'Best use', value: 'Before sending a message to school staff' },
        ]}
        sections={[
          {
            title: 'What parents can ask',
            body: 'Use this area for practical questions about school heat conditions and student safety.',
            bullets: [
              'Is outdoor activity safe today?',
              'What should my child bring for class under high heat?',
              'Who should I contact if my child feels unwell after school?',
            ],
          },
          {
            title: 'What to report quickly',
            body: 'Send a concern immediately when a child shows possible heat-related symptoms or when a school notice is unclear.',
            bullets: [
              'Dizziness, headache, nausea, or exhaustion',
              'Repeated absence from class due to heat-related illness',
              'Questions about a schedule change or activity suspension',
            ],
            tone: 'alert',
          },
          {
            title: 'How the project handles concerns',
            body: 'The system is scoped to heat advisories, weather context, school alerts, and parent-facing safety guidance.',
            bullets: [
              'It does not replace medical advice or emergency services.',
              'It prioritizes heat index, humidity, and school operations.',
              'It helps parents decide when to ask for urgent follow-up.',
            ],
            tone: 'success',
          },
        ]}
        footerNote="For live, scoped answers, go to the Chatbot page and ask a question in English, Tagalog, or Taglish."
      />
      <section className="parent-messaging-section" aria-labelledby="question-and-concern-heading">
        <div className="parent-section-header" id="question-and-concern-form">
          <p className="parent-section-eyebrow">Question and Concern</p>
          <h2 id="question-and-concern-heading">Send a question or concern to the advisory teacher</h2>
          <p className="parent-section-copy">
            Use this form for practical parent questions, safety concerns, or follow-up details that need a direct school response.
          </p>
        </div>

        <div className="parent-message-form">
          <label className="parent-message-field" htmlFor="teacherRecipient">
            <span className="parent-message-field-label">Teacher recipient</span>
            <select
              id="teacherRecipient"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">Select a teacher</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
          </label>
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea placeholder="Write your question or concern..." value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="parent-message-actions">
            <button onClick={handleSend} className="primary" disabled={!recipientTeacher}>Send to Teacher</button>
          </div>
        </div>

        <div className="parent-message-list" id="adviser-messages" aria-labelledby="adviser-messages-heading">
          <div className="parent-section-header">
            <p className="parent-section-eyebrow">Adviser Messages</p>
            <h2 id="adviser-messages-heading">Recent messages</h2>
          </div>

          {messages.length === 0 && <div className="empty-state">No messages yet</div>}
          {messages.map((m) => (
            <article key={m.id} className="parent-message-item">
              <strong>{m.subject}</strong>
              <p>{m.body}</p>
              <small>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</small>
            </article>
          ))}
        </div>
      </section>
    </>
  );
};
