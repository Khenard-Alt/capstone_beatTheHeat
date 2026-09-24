import React, { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { STORAGE_KEYS } from '../utils/constants';
import {
  fetchPendingDeviceConfirmation,
  resolveDeviceConfirmation,
  type PendingDeviceConfirmation,
} from '../services/deviceSession.service';

const POLL_INTERVAL_MS = 8000;

interface DeviceConfirmationContextType {
  pending: PendingDeviceConfirmation | null;
  respond: (approve: boolean) => Promise<boolean>;
}

export const DeviceConfirmationContext = createContext<DeviceConfirmationContextType | undefined>(undefined);

interface DeviceConfirmationProviderProps {
  children: ReactNode;
}

export const DeviceConfirmationProvider: React.FC<DeviceConfirmationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingDeviceConfirmation | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!user?.id || !token) {
        setPending(null);
        return;
      }

      try {
        const result = await fetchPendingDeviceConfirmation(user.id, token);
        if (mounted) {
          setPending(result);
        }
      } catch (error) {
        console.error('Failed to check for pending device confirmation:', error);
      }
    };

    void load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const respond = async (approve: boolean): Promise<boolean> => {
    if (!pending) return false;
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ?? '';
    try {
      const result = await resolveDeviceConfirmation(pending.sessionId, approve, token);
      return result.success;
    } catch (error) {
      console.error('Failed to resolve device confirmation:', error);
      return false;
    } finally {
      setPending(null);
    }
  };

  return (
    <DeviceConfirmationContext.Provider value={{ pending, respond }}>
      {children}
    </DeviceConfirmationContext.Provider>
  );
};
