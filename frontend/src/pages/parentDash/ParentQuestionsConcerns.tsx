import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchParentMessages, sendParentMessage, type ParentMessage } from '../../services/parentMessages.service';
import { fetchUsersByRole, type AppUser } from '../../services/users.service';
import { ParentSectionPage } from './ParentSectionPage';
import '../../styles/ParentQuestionsConcerns.css';
import '../../styles/Messenger.css';

type TeacherThread = {
  id: string;
  teacher: AppUser;
  messages: ParentMessage[];
  preview: string;
  updatedAt: string | null;
};

const formatTime = (value?: string | null) => {
  if (!value) return 'No messages yet';
  return new Date(value).toLocaleString();
};

const getDisplayName = (person?: AppUser) => (person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown teacher');

export const ParentQuestionsConcerns: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [activeTeacherId, setActiveTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const currentParentId = user?.id ?? 'parent-1';

  const loadMessages = async () => {
    try {
      setLoading(true);
      const [messageData, teacherData] = await Promise.all([
        fetchParentMessages({ limit: 100, offset: 0, parentId: currentParentId }),
        fetchUsersByRole('teacher'),
      ]);

      setMessages(messageData);
      setTeachers(teacherData);

      setActiveTeacherId((current) => {
        if (current && teacherData.some((teacher) => teacher.id === current)) {
          return current;
        }

        const threadWithHistory = teacherData.find((teacher) =>
          messageData.some((message) => message.teacher_id === teacher.id)
        );

        return threadWithHistory?.id || teacherData[0]?.id || '';
      });
    } catch (error) {
      console.error('Failed to load parent messages:', error);
      setMessages([]);
      setTeachers([]);
      setActiveTeacherId('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();

    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentParentId]);

  const teacherThreads = useMemo<TeacherThread[]>(() => {
    return teachers.map((teacher) => {
      const threadMessages = messages
        .filter((message) => message.teacher_id === teacher.id)
        .slice()
        .sort((left, right) => new Date(left.created_at || '').getTime() - new Date(right.created_at || '').getTime());

      const latestMessage = threadMessages.at(-1);

      return {
        id: teacher.id,
        teacher,
        messages: threadMessages,
        preview: latestMessage?.body || 'Start a new conversation with this teacher.',
        updatedAt: latestMessage?.created_at || null,
      };
    });
  }, [messages, teachers]);

  const activeTeacher = useMemo(() => teachers.find((teacher) => teacher.id === activeTeacherId) ?? null, [activeTeacherId, teachers]);
  const activeThread = useMemo(() => teacherThreads.find((thread) => thread.id === activeTeacherId) ?? null, [activeTeacherId, teacherThreads]);

  const handleSend = async () => {
    if (!activeTeacher || !body.trim()) {
      return;
    }

    try {
      setSending(true);
      const created = await sendParentMessage({
        parentUserId: currentParentId,
        teacherUserId: activeTeacher.id,
        senderRole: 'parent',
        subject: subject.trim() || `Re: ${getDisplayName(activeTeacher)}`,
        body: body.trim(),
      });

      setMessages((prev) => [created, ...prev]);
      setSubject('');
      setBody('');
    } catch (error) {
      console.error('Send message failed', error);
    } finally {
      setSending(false);
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

      <section className="messenger-section" id="question-and-concern-form" aria-labelledby="question-and-concern-heading">
        <div className="parent-section-header">
          <p className="parent-section-eyebrow">Adviser Messages</p>
          <h2 id="question-and-concern-heading">Messenger-style parent chat</h2>
          <p className="parent-section-copy">
            Every teacher gets their own conversation thread, so recent chats stay grouped by adviser and are easy to follow.
          </p>
        </div>

        <div className="messenger-shell">
          <aside className="messenger-thread-rail">
            <div>
              <p className="parent-section-eyebrow">Recent Threads</p>
              <p className="messenger-hint">Chats are grouped per teacher. Pick one thread, then send your follow-up below.</p>
            </div>

            <div className="messenger-thread-list">
              {loading && <div className="messenger-empty">Loading teacher conversations...</div>}
              {!loading && teacherThreads.length === 0 && <div className="messenger-empty">No teacher threads yet.</div>}
              {teacherThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`messenger-thread-button ${activeTeacherId === thread.id ? 'active' : ''}`}
                  onClick={() => setActiveTeacherId(thread.id)}
                >
                  <div className="messenger-thread-top">
                    <div>
                      <div className="messenger-thread-title">{getDisplayName(thread.teacher)}</div>
                      <div className="messenger-thread-subtitle">Teacher adviser</div>
                    </div>
                    <div className="messenger-thread-subtitle">{thread.messages.length} msgs</div>
                  </div>
                  <div className="messenger-thread-preview">{thread.preview}</div>
                  <div className="messenger-thread-meta">
                    <span>Latest</span>
                    <span>{formatTime(thread.updatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div className="messenger-chat-panel">
            <div className="messenger-chat-header">
              <div>
                <p className="parent-section-eyebrow">Conversation</p>
                <h2>{activeTeacher ? getDisplayName(activeTeacher) : 'Select a teacher thread'}</h2>
                <p>{activeThread ? `${activeThread.messages.length} message${activeThread.messages.length === 1 ? '' : 's'} in this thread` : 'Choose a teacher to review the thread and continue the chat.'}</p>
              </div>
              <div className="messenger-chat-badge">Parent view</div>
            </div>

            <div className="messenger-chat-bubble-list">
              {activeThread?.messages && activeThread.messages.length > 0 ? (
                activeThread.messages.map((message) => {
                  const outgoing = message.sender_role === 'parent';
                  return (
                    <article key={message.id} className={`messenger-message ${outgoing ? 'outgoing' : 'incoming'}`}>
                      <div className="messenger-avatar">{outgoing ? 'ME' : 'AD'}</div>
                      <div className="messenger-bubble">
                        <span className="messenger-meta">
                          {outgoing ? 'You' : getDisplayName(activeTeacher ?? undefined)} · {formatTime(message.created_at)}
                        </span>
                        {message.subject && <strong style={{ display: 'block', marginBottom: 8 }}>{message.subject}</strong>}
                        <div>{message.body}</div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="messenger-empty">Open a teacher thread to see the message history here.</div>
              )}
            </div>

            <div className="messenger-compose">
              <div className="messenger-compose-grid">
                <label className="messenger-compose-field">
                  <span className="parent-section-eyebrow">Teacher recipient</span>
                  <select value={activeTeacherId} onChange={(event) => setActiveTeacherId(event.target.value)}>
                    <option value="">Select a teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {getDisplayName(teacher)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="messenger-compose-field">
                  <span className="parent-section-eyebrow">Subject</span>
                  <input placeholder="Optional subject line for this thread" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </label>
              </div>

              <textarea placeholder="Write your question or concern..." value={body} onChange={(event) => setBody(event.target.value)} />

              <div className="messenger-compose-actions">
                <div className="messenger-hint">
                  Keep the tone short and specific. The thread stays under the selected teacher so your chat history is easy to review later.
                </div>
                <button type="button" className="primary" onClick={() => void handleSend()} disabled={sending || !activeTeacher}>
                  {sending ? 'Sending...' : 'Send to Teacher'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="messenger-side-panel">
          <Card title="How to use this chat" className="teacher-panel-card tone-success">
            <ul className="teacher-list">
              <li>Select the correct adviser thread before sending a follow-up.</li>
              <li>Use one conversation per teacher so the history stays easy to trace.</li>
              <li>If the issue is urgent, treat the message as a follow-up only and escalate through the proper school channel.</li>
            </ul>
          </Card>
        </div>
      </section>
    </>
  );
};