import React, { useState } from 'react';
import { Modal } from './Modal';
import { createIncident } from '../services/incidents.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const IncidentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!type.trim() || !description.trim()) return alert('Type and description are required');
    setLoading(true);
    try {
      await createIncident({ type, description, actionTaken });
      alert('Incident reported');
      setType(''); setDescription(''); setActionTaken('');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to report incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Incident" size="small">
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        <input placeholder="Incident type" value={type} onChange={(e) => setType(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
        <input placeholder="Action taken" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
        <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Report'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default IncidentModal;
