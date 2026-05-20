import React, { useState } from 'react';
import { Modal } from './Modal';
import { createAnnouncement } from '../services/announcements.service';
import { MdGroup, MdGroups, MdPerson, MdCampaign, MdPriorityHigh, MdInfoOutline } from 'react-icons/md';

type AnnouncementAudience = 'global' | 'parents' | 'teachers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('info');
  const [audience, setAudience] = useState<AnnouncementAudience>('global');
  const [loading, setLoading] = useState(false);

  const getAudienceFlags = (value: AnnouncementAudience): { notifyParents: boolean; notifyTeachers: boolean } => {
    if (value === 'parents') {
      return { notifyParents: true, notifyTeachers: false };
    }

    if (value === 'teachers') {
      return { notifyParents: false, notifyTeachers: true };
    }

    return { notifyParents: true, notifyTeachers: true };
  };

  const audienceOptions: Array<{
    value: AnnouncementAudience;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'global',
      label: 'Global',
      description: 'Send to both parents and teachers.',
      icon: <MdGroups />,
    },
    {
      value: 'parents',
      label: 'Parents only',
      description: 'Visible and emailed only to parents.',
      icon: <MdPerson />,
    },
    {
      value: 'teachers',
      label: 'Teachers only',
      description: 'Visible and emailed only to teachers.',
      icon: <MdGroup />,
    },
  ];

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return alert('Title and body are required');
    setLoading(true);
    try {
      await createAnnouncement({ title, body, priority, audience, ...getAudienceFlags(audience) });
      alert('Announcement created');
      setTitle('');
      setBody('');
      setAudience('global');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Announcement" size="large">
      <div className="announcement-modal">
        <div className="announcement-modal-hero">
          <div className="announcement-modal-kicker">
            <MdCampaign />
            <span>Broadcast message</span>
          </div>
          <h3>Share school updates with the right audience</h3>
          <p>Write once, then choose whether it goes to everyone, parents only, or teachers only.</p>
        </div>

        <div className="announcement-modal-grid">
          <label className="announcement-field announcement-field-full">
            <span>Title</span>
            <input className="announcement-input" placeholder="Enter announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="announcement-field announcement-field-full">
            <span>Message</span>
            <textarea className="announcement-textarea" placeholder="Write the announcement body here..." value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </label>

          <label className="announcement-field">
            <span><MdPriorityHigh /> Priority</span>
            <select className="announcement-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <div className="announcement-field announcement-field-full">
            <span><MdInfoOutline /> Audience</span>
            <div className="announcement-audience-grid" role="radiogroup" aria-label="Announcement audience">
              {audienceOptions.map((option) => (
                <label key={option.value} className={`audience-card ${audience === option.value ? 'audience-card-active' : ''}`}>
                  <input
                    type="radio"
                    name="announcement-audience"
                    value={option.value}
                    checked={audience === option.value}
                    onChange={() => setAudience(option.value)}
                  />
                  <span className="audience-card-icon">{option.icon}</span>
                  <span className="audience-card-copy">
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
            <small className="announcement-help-text">
              Global sends to both groups. Parent-only and teacher-only limit delivery to one panel.
            </small>
          </div>
        </div>

        <div className="announcement-modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create announcement'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementModal;
