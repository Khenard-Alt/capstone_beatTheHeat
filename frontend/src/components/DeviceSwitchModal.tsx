import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useAuth } from '../hooks/useAuth';
import { useDeviceConfirmation } from '../hooks/useDeviceConfirmation';

export const DeviceSwitchModal: React.FC = () => {
  const { pending, respond } = useDeviceConfirmation();
  const { logout } = useAuth();
  const [isResponding, setIsResponding] = useState(false);

  if (!pending) return null;

  const handleYes = async () => {
    setIsResponding(true);
    const succeeded = await respond(true);
    setIsResponding(false);
    if (succeeded) {
      logout();
      window.location.href = '/login';
    }
  };

  const handleNo = async () => {
    setIsResponding(true);
    await respond(false);
    setIsResponding(false);
  };

  return (
    <Modal isOpen title="New sign-in detected" onClose={() => {}} size="small" showCloseButton={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p>
          Someone is signing in to your account from <strong>{pending.deviceLabel}</strong>. Is this you switching
          devices or browsers?
        </p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          If you say yes, you'll be logged out here. If you don't respond within 5 minutes, the other sign-in will be
          denied automatically.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={handleNo} disabled={isResponding}>
            No, it's not me
          </Button>
          <Button variant="primary" onClick={handleYes} disabled={isResponding}>
            Yes, that's me
          </Button>
        </div>
      </div>
    </Modal>
  );
};
