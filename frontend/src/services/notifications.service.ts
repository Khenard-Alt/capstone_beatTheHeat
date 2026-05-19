import { apiClient } from './api';
import type { ApiEnvelope } from './api';
import type { Notification } from '../types';

export const fetchNotifications = async (
  userId: string,
  limit = 50,
  offset = 0
): Promise<Notification[]> => {
  const { data } = await apiClient.get<ApiEnvelope<Notification[]>>('/api/notifications', {
    params: { userId, limit, offset },
  });

  return data.data ?? [];
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/api/notifications/${id}/read`);
};

export const clearNotifications = async (userId: string): Promise<void> => {
  await apiClient.delete('/api/notifications/clear', { params: { userId } });
};
