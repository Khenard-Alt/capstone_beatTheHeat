import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchParentMessages, sendParentMessage, type ParentMessage } from '../../services/parentMessages.service';
import { fetchUsersByRole, type AppUser } from '../../services/users.service';
import '../../styles/TeacherPanel.css';
import '../../styles/ParentQuestionsConcerns.css';
import '../../styles/Messenger.css';

type ParentThread = {
  id: string;
  parent: AppUser;
  messages: ParentMessage[];
  preview: string;
  updatedAt: string | null;
};

const formatTime = (value?: string | null) => {
  if (!value) return 'No messages yet';
  return new Date(value).toLocaleString();
};

const getDisplayName = (person?: AppUser) => (person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown parent');

const TeacherMessages: React.FC = () => {
	const { user } = useAuth();
	const [messages, setMessages] = useState<ParentMessage[]>([]);
	const [parents, setParents] = useState<AppUser[]>([]);
	const [activeParentId, setActiveParentId] = useState('');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);

	const currentTeacherId = user?.id ?? 'teacher-1';

	const loadMessages = async () => {
		try {
			setLoading(true);
			const [messageData, parentData] = await Promise.all([
				fetchParentMessages({ limit: 100, offset: 0, teacherId: currentTeacherId }),
				fetchUsersByRole('parent'),
			]);

			setMessages(messageData);
			setParents(parentData);

			setActiveParentId((current) => {
				if (current && parentData.some((parent) => parent.id === current)) {
					return current;
				}

				const threadWithHistory = parentData.find((parent) =>
					messageData.some((message) => message.parent_id === parent.id)
				);

				return threadWithHistory?.id || parentData[0]?.id || '';
			});
		} catch (error) {
			console.error('Failed to load teacher messages:', error);
			setMessages([]);
			setParents([]);
			setActiveParentId('');
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
	}, [currentTeacherId]);

	const parentThreads = useMemo<ParentThread[]>(() => {
		return parents.map((parent) => {
			const threadMessages = messages
				.filter((message) => message.parent_id === parent.id)
				.slice()
				.sort((left, right) => new Date(left.created_at || '').getTime() - new Date(right.created_at || '').getTime());

			const latestMessage = threadMessages.at(-1);

			return {
				id: parent.id,
				parent,
				messages: threadMessages,
				preview: latestMessage?.body || 'No chat yet. Open the thread to start the conversation.',
				updatedAt: latestMessage?.created_at || null,
			};
		});
	}, [messages, parents]);

	const activeParent = useMemo(() => parents.find((parent) => parent.id === activeParentId) ?? null, [activeParentId, parents]);
	const activeThread = useMemo(() => parentThreads.find((thread) => thread.id === activeParentId) ?? null, [activeParentId, parentThreads]);

	const handleSend = async () => {
		if (!activeParent || !body.trim()) {
			return;
		}

		try {
			setSending(true);
			const created = await sendParentMessage({
				parentUserId: activeParent.id,
				teacherUserId: currentTeacherId,
				senderRole: 'teacher',
				subject: subject.trim() || `Re: ${getDisplayName(activeParent)}`,
				body: body.trim(),
			});

			setMessages((prev) => [created, ...prev]);
			setSubject('');
			setBody('');
		} catch (error) {
			console.error('Failed to send teacher message:', error);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="teacher-page-shell">
			<div className="teacher-hero">
				<div>
					<p className="teacher-eyebrow">Teacher panel</p>
					<h1>Messages</h1>
					<p>Reply to parent concerns in a messenger-style thread that keeps each parent conversation separate and easy to review.</p>
				</div>
				<div className="teacher-hero-card">
					<div>
						<strong>Parent inbox</strong>
						<p>Threaded history for this adviser only.</p>
					</div>
				</div>
			</div>

			<section className="messenger-section" id="teacher-messages-top" aria-labelledby="teacher-messages-heading">
				<div className="parent-section-header">
					<p className="parent-section-eyebrow">Adviser Messages</p>
					<h2 id="teacher-messages-heading">Parent chat inbox</h2>
					<p className="parent-section-copy">
						Recent chats are grouped by parent so your replies stay inside the right conversation history.
					</p>
				</div>

				<div className="messenger-shell">
					<aside className="messenger-thread-rail">
						<div>
							<p className="parent-section-eyebrow">Recent Chats</p>
							<p className="messenger-hint">Pick a parent thread, review the history, then send your reply from the composer.</p>
						</div>

						<div className="messenger-thread-list">
							{loading && <div className="messenger-empty">Loading parent chats...</div>}
							{!loading && parentThreads.length === 0 && <div className="messenger-empty">No parent chats yet.</div>}
							{parentThreads.map((thread) => (
								<button
									key={thread.id}
									type="button"
									className={`messenger-thread-button ${activeParentId === thread.id ? 'active' : ''}`}
									onClick={() => setActiveParentId(thread.id)}
								>
									<div className="messenger-thread-top">
										<div>
											<div className="messenger-thread-title">{getDisplayName(thread.parent)}</div>
											<div className="messenger-thread-subtitle">Parent account</div>
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
								<h2>{activeParent ? getDisplayName(activeParent) : 'Select a parent thread'}</h2>
								<p>{activeThread ? `${activeThread.messages.length} message${activeThread.messages.length === 1 ? '' : 's'} in this thread` : 'Choose a parent thread to view the chat history and reply.'}</p>
							</div>
							<div className="messenger-chat-badge">Teacher view</div>
						</div>

						<div className="messenger-chat-bubble-list">
							{activeThread?.messages && activeThread.messages.length > 0 ? (
								activeThread.messages.map((message) => {
									const outgoing = message.sender_role === 'teacher';
									return (
										<article key={message.id} className={`messenger-message ${outgoing ? 'outgoing' : 'incoming'}`}>
											<div className="messenger-avatar">{outgoing ? 'ME' : 'PA'}</div>
											<div className="messenger-bubble">
												<span className="messenger-meta">
													{outgoing ? 'You' : getDisplayName(activeParent ?? undefined)} · {formatTime(message.created_at)}
												</span>
												{message.subject && <strong style={{ display: 'block', marginBottom: 8 }}>{message.subject}</strong>}
												<div>{message.body}</div>
											</div>
										</article>
									);
								})
							) : (
								<div className="messenger-empty">Open a parent thread to see the conversation history.</div>
							)}
						</div>

						<div className="messenger-compose">
							<div className="messenger-compose-grid">
								<label className="messenger-compose-field">
									<span className="parent-section-eyebrow">Parent recipient</span>
									<select value={activeParentId} onChange={(event) => setActiveParentId(event.target.value)}>
										<option value="">Select a parent</option>
										{parents.map((parent) => (
											<option key={parent.id} value={parent.id}>
												{getDisplayName(parent)}
											</option>
										))}
									</select>
								</label>

								<label className="messenger-compose-field">
									<span className="parent-section-eyebrow">Subject</span>
									<input placeholder="Optional subject line" value={subject} onChange={(event) => setSubject(event.target.value)} />
								</label>
							</div>

							<textarea placeholder="Write your reply or note..." value={body} onChange={(event) => setBody(event.target.value)} />

							<div className="messenger-compose-actions">
								<div className="messenger-hint">
									Use short, factual replies that stay aligned with the school heat guidance and keep one thread per parent.
								</div>
								<button type="button" className="primary" onClick={() => void handleSend()} disabled={sending || !activeParent}>
									{sending ? 'Sending...' : 'Send to Parent'}
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="messenger-side-panel" style={{ marginTop: 20 }}>
					<Card title="Messaging notes" className="teacher-panel-card tone-success">
						<ul className="teacher-list">
							<li>Keep replies short, factual, and tied to school heat guidance.</li>
							<li>Use the parent sender name before giving follow-up instructions.</li>
							<li>Continue the same thread instead of starting a new topic for the same concern.</li>
						</ul>
					</Card>

					<Card title="Quick tips" className="teacher-panel-card tone-alert">
						<ul className="teacher-list">
							<li>Use the inbox before sending a new message.</li>
							<li>Match the parent panel wording for consistency.</li>
							<li>Send a follow-up if the concern changes status.</li>
						</ul>
					</Card>
				</div>
			</section>
		</div>
	);
};

export default TeacherMessages;