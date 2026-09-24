import { apiClient } from './api';
import type { User } from '../types';

export interface PendingDeviceConfirmation {
  sessionId: string;
  deviceLabel: string;
}

export type DeviceConfirmationStatus = 'pending' | 'active' | 'denied' | 'expired' | 'not_found';

export const fetchPendingDeviceConfirmation = async (
  userId: string,
  token: string
): Promise<PendingDeviceConfirmation | null> => {
  const { data } = await apiClient.get('/api/users/device-confirmation/pending', {
    params: { userId, token },
  });
  return data?.pending ?? null;
};

export const resolveDeviceConfirmation = async (
  sessionId: string,
  approve: boolean,
  token: string
): Promise<{ success: boolean; status?: string; message?: string }> => {
  const { data } = await apiClient.post('/api/users/device-confirmation/resolve', { sessionId, approve, token });
  return data;
};

export const fetchDeviceConfirmationStatus = async (
  sessionId: string
): Promise<{ status: DeviceConfirmationStatus; user?: User; token?: string }> => {
  const { data } = await apiClient.get('/api/users/device-confirmation/status', {
    params: { sessionId },
  });
  return { status: data?.status ?? 'not_found', user: data?.user, token: data?.token };
};
