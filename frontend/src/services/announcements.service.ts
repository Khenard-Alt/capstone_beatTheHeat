import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority?: string;
  created_at?: string;
}

export type AnnouncementAudience = 'global' | 'parents' | 'teachers';

export const fetchAnnouncements = async (limit = 5, offset = 0): Promise<Announcement[]> => {
  const { data } = await apiClient.get<ApiEnvelope<Announcement[]>>('/api/announcements', { params: { limit, offset } });
  return data.data || [];
};

export interface AnnouncementsPage {
  data: Announcement[];
  total: number;
}

export const fetchAnnouncementsPage = async (limit = 10, offset = 0): Promise<AnnouncementsPage> => {
  const { data } = await apiClient.get<ApiEnvelope<Announcement[]> & { pagination?: { total?: number } }>(
    '/api/announcements',
    { params: { limit, offset } }
  );
  return { data: data.data || [], total: data.pagination?.total ?? (data.data || []).length };
};

export const createAnnouncement = async (payload: { schoolId?: string; title: string; body: string; priority?: string; audience?: AnnouncementAudience; notifyParents?: boolean; notifyTeachers?: boolean }) => {
  const { data } = await apiClient.post<ApiEnvelope<Announcement>>('/api/announcements', payload);
  return data.data;
};

