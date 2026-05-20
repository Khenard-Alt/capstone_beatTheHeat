import React, { useState } from 'react';
import { Modal } from './Modal';
import { createAnnouncement } from '../services/announcements.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('info');
  const [notifyParents, setNotifyParents] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return alert('Title and body are required');
    setLoading(true);
    try {
      await createAnnouncement({ title, body, priority, notifyParents });
      alert('Announcement created');
      setTitle('');
      setBody('');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Announcement" size="small">
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <label style={{display:'flex', alignItems:'center', gap:8}}>
          <input type="checkbox" checked={notifyParents} onChange={(e) => setNotifyParents(e.target.checked)} />
          <span>Notify parents by email</span>
        </label>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default AnnouncementModal;
