import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchParentMessages, sendParentMessage, type ParentMessage } from '../../services/parentMessages.service';
import { fetchUsersByRole, type AppUser } from '../../services/users.service';
import '../../styles/TeacherPanel.css';
import '../../styles/ParentQuestionsConcerns.css';

const TeacherMessages: React.FC = () => {
	const { user } = useAuth();
	const [messages, setMessages] = useState<ParentMessage[]>([]);
	const [parents, setParents] = useState<AppUser[]>([]);
	const [selectedParentId, setSelectedParentId] = useState('');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);

	const currentTeacherId = user?.id ?? 'teacher-1';

	const loadMessages = async () => {
		try {
			setLoading(true);
			const [messageData, parentData] = await Promise.all([
				fetchParentMessages(20, 0),
				fetchUsersByRole('parent'),
			]);

			setMessages(messageData.filter((message) => !user?.id || message.teacher_user_id === user.id));
			setParents(parentData);
			setSelectedParentId((current) => current || parentData[0]?.id || '');
		} catch (error) {
			console.error('Failed to load teacher messages:', error);
			setMessages([]);
			setParents([]);
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
	}, [user?.id]);

	const recipientParent = useMemo(() => parents.find((parent) => parent.id === selectedParentId) ?? parents[0], [parents, selectedParentId]);

	const handleSend = async () => {
		if (!recipientParent || !subject.trim() || !body.trim()) {
			return;
		}

		try {
			setSending(true);
			const created = await sendParentMessage({
				parentUserId: recipientParent.id,
				teacherUserId: currentTeacherId,
				studentId: null,
				subject: subject.trim(),
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
					<p>Reply to parent concerns and keep the message thread aligned with the parent panel conversation flow.</p>
				</div>
				<div className="teacher-hero-card">
					<div>
						<strong>Parent inbox</strong>
						<p>Same message channel, teacher-side view.</p>
					</div>
				</div>
			</div>

			<section className="parent-messaging-section" id="teacher-messages-top" aria-labelledby="teacher-messages-heading">
				<div className="parent-section-header">
					<p className="parent-section-eyebrow">Adviser Messages</p>
					<h2 id="teacher-messages-heading">Parent-to-teacher message feed</h2>
					<p className="parent-section-copy">
						Review parent concerns, then send a direct reply back through the shared message table.
					</p>
				</div>

				<div className="parent-message-form" id="teacher-message-compose">
					<label className="parent-message-field" htmlFor="parentRecipient">
						<span className="parent-message-field-label">Parent recipient</span>
						<select
							id="parentRecipient"
							value={selectedParentId}
							onChange={(event) => setSelectedParentId(event.target.value)}
						>
							<option value="">Select a parent</option>
							{parents.map((parent) => (
								<option key={parent.id} value={parent.id}>
									{parent.firstName} {parent.lastName}
								</option>
							))}
						</select>
					</label>
					<input placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
					<textarea placeholder="Write your reply or note..." value={body} onChange={(event) => setBody(event.target.value)} />
					<div className="parent-message-actions">
						<button type="button" className="primary" onClick={() => void handleSend()} disabled={sending || !recipientParent}>
							{sending ? 'Sending...' : 'Send to Parent'}
						</button>
					</div>
				</div>

				<div className="parent-message-list">
					<div className="parent-section-header">
						<p className="parent-section-eyebrow">Inbox</p>
						<h2>Recent parent messages</h2>
					</div>

					{loading && <div className="empty-state">Loading messages...</div>}
					{!loading && messages.length === 0 && <div className="empty-state">No messages yet</div>}
					{messages.map((message) => (
						<article key={message.id} className="parent-message-item">
							<strong>{message.subject}</strong>
							<p>{message.body}</p>
							<small>{message.created_at ? new Date(message.created_at).toLocaleString() : ''}</small>
							<div className="parent-message-actions" style={{ marginTop: 12 }}>
								<button
									type="button"
									className="primary"
									onClick={() => {
										setSelectedParentId(message.parent_user_id || '');
										setSubject(`Re: ${message.subject}`);
										setBody(`Hi, `);
									}}
								>
									Reply to parent
								</button>
							</div>
						</article>
					))}
				</div>
			</section>

			<div className="teacher-layout" style={{ marginTop: 24 }}>
				<div className="teacher-main">
					<Card title="Messaging notes" className="teacher-panel-card tone-success">
						<ul className="teacher-list">
							<li>Keep replies short, factual, and tied to school heat guidance.</li>
							<li>Use the parent sender name before giving follow-up instructions.</li>
							<li>Continue the same thread instead of starting a new topic for the same concern.</li>
						</ul>
					</Card>
				</div>
				<div className="teacher-side">
					<Card title="Quick tips" className="teacher-panel-card tone-alert">
						<ul className="teacher-list">
							<li>Use the inbox before sending a new message.</li>
							<li>Match the parent panel wording for consistency.</li>
							<li>Send a follow-up if the concern changes status.</li>
						</ul>
					</Card>
				</div>
			</div>
		</div>
	);
};

export default TeacherMessages;