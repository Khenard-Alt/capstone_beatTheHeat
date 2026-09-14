import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { fetchStaffMessages, sendStaffMessage, type StaffMessage } from '../../services/staffMessages.service';
import { fetchUsersByRole, type AppUser } from '../../services/users.service';
import '../../styles/TeacherPanel.css';
import '../../styles/ParentQuestionsConcerns.css';
import '../../styles/Messenger.css';

type StaffThread = {
	id: string;
	colleague: AppUser;
	messages: StaffMessage[];
	preview: string;
	updatedAt: string | null;
};

const formatTime = (value?: string | null) => {
	if (!value) return 'No messages yet';
	return new Date(value).toLocaleString();
};

const getDisplayName = (person?: AppUser) => (person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown staff');

const TeacherStaffMessages: React.FC = () => {
	const { user } = useAuth();
	const [messages, setMessages] = useState<StaffMessage[]>([]);
	const [colleagues, setColleagues] = useState<AppUser[]>([]);
	const [activePeerId, setActivePeerId] = useState('');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [showNewMessage, setShowNewMessage] = useState(false);
	const [newMessageSearch, setNewMessageSearch] = useState('');
	const hasLoadedOnce = useRef(false);

	const currentUserId = user?.id ?? '';

	const loadMessages = async () => {
		try {
			if (!hasLoadedOnce.current) setLoading(true);
			const [messageData, teacherData] = await Promise.all([
				fetchStaffMessages({ limit: 100, offset: 0, userId: currentUserId }),
				fetchUsersByRole('teacher'),
			]);

			setMessages(messageData);
			setColleagues(teacherData.filter((teacher) => teacher.id !== currentUserId));
		} catch (error) {
			console.error('Failed to load staff messages:', error);
			setMessages([]);
			setColleagues([]);
		} finally {
			setLoading(false);
			hasLoadedOnce.current = true;
		}
	};

	useEffect(() => {
		if (!currentUserId) return;
		void loadMessages();

		const intervalId = window.setInterval(() => {
			void loadMessages();
		}, 30000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [currentUserId]);

	const staffThreads = useMemo<StaffThread[]>(() => {
		return colleagues
			.map((colleague) => {
				const threadMessages = messages
					.filter((message) => message.sender_id === colleague.id || message.recipient_id === colleague.id)
					.slice()
					.sort((left, right) => new Date(left.created_at || '').getTime() - new Date(right.created_at || '').getTime());

				const latestMessage = threadMessages.at(-1);

				return {
					id: colleague.id,
					colleague,
					messages: threadMessages,
					preview: latestMessage?.body || 'No chat yet. Open the thread to start the conversation.',
					updatedAt: latestMessage?.created_at || null,
				};
			})
			.filter((thread) => thread.messages.length > 0)
			.sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());
	}, [messages, colleagues]);

	const newMessageCandidates = useMemo(() => {
		const query = newMessageSearch.trim().toLowerCase();
		if (!query) return colleagues;
		return colleagues.filter((colleague) => getDisplayName(colleague).toLowerCase().includes(query));
	}, [colleagues, newMessageSearch]);

	const activePeer = useMemo(() => colleagues.find((colleague) => colleague.id === activePeerId) ?? null, [activePeerId, colleagues]);
	const activeThread = useMemo(() => staffThreads.find((thread) => thread.id === activePeerId) ?? null, [activePeerId, staffThreads]);

	const handleSend = async () => {
		if (!activePeer || !body.trim() || !currentUserId) {
			return;
		}

		try {
			setSending(true);
			const created = await sendStaffMessage({
				senderId: currentUserId,
				recipientId: activePeer.id,
				subject: subject.trim() || `Re: ${getDisplayName(activePeer)}`,
				body: body.trim(),
			});

			if (created) setMessages((prev) => [created, ...prev]);
			setSubject('');
			setBody('');
		} catch (error) {
			console.error('Failed to send staff message:', error);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="teacher-page-shell">
			<div className="teacher-hero">
				<div>
					<h1 id="teacher-staff-messages-heading">Messages from Co-Teachers</h1>
					<p>Coordinate directly with other teachers — e.g. an advisory teacher looping in a subject teacher.</p>
				</div>
				<div className="teacher-hero-card">
					<div>
						<strong>Staff inbox</strong>
						<p>Teacher-to-teacher conversations only.</p>
					</div>
				</div>
			</div>

			<section className="messenger-section" id="teacher-staff-messages-top" aria-labelledby="teacher-staff-messages-heading">
				<div className="messenger-shell">
					<aside className="messenger-thread-rail">
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
							<p className="parent-section-eyebrow">Recent Chats</p>
							<button
								type="button"
								className="btn btn-primary"
								style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 13 }}
								onClick={() => {
									setShowNewMessage((open) => !open);
									setNewMessageSearch('');
								}}
								aria-label="Start a new message"
							>
								<MdAdd /> New Message
							</button>

							{showNewMessage && (
								<div
									style={{
										position: 'absolute',
										top: '100%',
										right: 0,
										width: 260,
										zIndex: 30,
										background: '#fff',
										border: '1px solid #e2e8f0',
										borderRadius: 10,
										boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
										marginTop: 6,
										overflow: 'hidden',
									}}
								>
									<div style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>
										<input
											autoFocus
											value={newMessageSearch}
											onChange={(event) => setNewMessageSearch(event.target.value)}
											placeholder="Search teacher by name"
											style={{ width: '100%' }}
										/>
									</div>
									<div style={{ maxHeight: 240, overflowY: 'auto' }}>
										{newMessageCandidates.length === 0 ? (
											<div style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>No matching teachers.</div>
										) : (
											newMessageCandidates.map((colleague) => (
												<button
													type="button"
													key={colleague.id}
													onClick={() => {
														setActivePeerId(colleague.id);
														setShowNewMessage(false);
														setNewMessageSearch('');
													}}
													style={{
														display: 'flex',
														alignItems: 'center',
														gap: 8,
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
													<Avatar size={24} src={colleague.avatarUrl} firstName={colleague.firstName} lastName={colleague.lastName} />
													{getDisplayName(colleague)}
												</button>
											))
										)}
									</div>
								</div>
							)}
						</div>

						<div className="messenger-thread-list">
							{loading && <div className="messenger-empty">Loading staff chats...</div>}
							{!loading && staffThreads.length === 0 && (
								<div className="messenger-empty">No staff chats yet. Tap "New Message" to start one.</div>
							)}
							{staffThreads.map((thread) => (
								<button
									key={thread.id}
									type="button"
									className={`messenger-thread-button ${activePeerId === thread.id ? 'active' : ''}`}
									onClick={() => setActivePeerId(thread.id)}
								>
									<div className="messenger-thread-top">
										<div className="messenger-thread-identity">
											<Avatar
												className="messenger-thread-avatar"
												size={32}
												src={thread.colleague.avatarUrl}
												firstName={thread.colleague.firstName}
												lastName={thread.colleague.lastName}
											/>
											<div>
												<div className="messenger-thread-title">{getDisplayName(thread.colleague)}</div>
												<div className="messenger-thread-subtitle">Teacher</div>
											</div>
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
								<h2>{activePeer ? getDisplayName(activePeer) : 'Select a teacher thread'}</h2>
								<p>{activeThread ? `${activeThread.messages.length} message${activeThread.messages.length === 1 ? '' : 's'} in this thread` : 'Choose a colleague or start a new message.'}</p>
							</div>
							<div className="messenger-chat-badge">Staff view</div>
						</div>

						<div className="messenger-chat-bubble-list">
							{activeThread?.messages && activeThread.messages.length > 0 ? (
								activeThread.messages.map((message) => {
									const outgoing = message.sender_id === currentUserId;
									return (
										<article key={message.id} className={`messenger-message ${outgoing ? 'outgoing' : 'incoming'}`}>
											<Avatar
												className="messenger-avatar"
												size={36}
												src={outgoing ? user?.avatarUrl : activePeer?.avatarUrl}
												firstName={outgoing ? user?.firstName : activePeer?.firstName}
												lastName={outgoing ? user?.lastName : activePeer?.lastName}
											/>
											<div className="messenger-bubble">
												<span className="messenger-meta">
													{outgoing ? 'You' : getDisplayName(activePeer ?? undefined)} · {formatTime(message.created_at)}
												</span>
												{message.subject && <strong style={{ display: 'block', marginBottom: 8 }}>{message.subject}</strong>}
												<div>{message.body}</div>
											</div>
										</article>
									);
								})
							) : (
								<div className="messenger-empty">Open a staff thread, or start a new message, to see the conversation history.</div>
							)}
						</div>

						<div className="messenger-compose" id="teacher-staff-message-compose">
							<div className="messenger-compose-grid">
								<label className="messenger-compose-field">
									<span className="parent-section-eyebrow">Teacher recipient</span>
									<select value={activePeerId} onChange={(event) => setActivePeerId(event.target.value)}>
										<option value="">Select a teacher</option>
										{colleagues.map((colleague) => (
											<option key={colleague.id} value={colleague.id}>
												{getDisplayName(colleague)}
											</option>
										))}
									</select>
								</label>

								<label className="messenger-compose-field">
									<span className="parent-section-eyebrow">Subject</span>
									<input placeholder="Optional subject line" value={subject} onChange={(event) => setSubject(event.target.value)} />
								</label>
							</div>

							<textarea placeholder="Write your message..." value={body} onChange={(event) => setBody(event.target.value)} />

							<div className="messenger-compose-actions">
								<button type="button" className="primary" onClick={() => void handleSend()} disabled={sending || !activePeer}>
									{sending ? 'Sending...' : 'Send to Teacher'}
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="messenger-side-panel" style={{ marginTop: 20 }}>
					<Card title="Staff messaging notes" className="teacher-panel-card tone-success">
						<ul className="teacher-list">
							<li>Use this for coordination between advisory and subject teachers.</li>
							<li>Parent concerns still belong in the Messages inbox, not here.</li>
							<li>Keep notes short and specific to the student or class involved.</li>
						</ul>
					</Card>
				</div>
			</section>
		</div>
	);
};

export default TeacherStaffMessages;
