import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority?: string;
  created_at?: string;
}

export const fetchAnnouncements = async (limit = 5, offset = 0): Promise<Announcement[]> => {
  const { data } = await apiClient.get<ApiEnvelope<Announcement[]>>('/api/announcements', { params: { limit, offset } });
  return data.data || [];
};
