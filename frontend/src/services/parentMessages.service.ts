import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface ParentMessage {
  id: string;
  parent_id?: string | null;
  teacher_id?: string | null;
  sender_role?: 'parent' | 'teacher' | null;
  subject: string;
  body: string;
  created_at?: string;
}

export const fetchParentMessages = async (options: { limit?: number; offset?: number; parentId?: string; teacherId?: string } = {}): Promise<ParentMessage[]> => {
  try {
    const { limit = 20, offset = 0, parentId, teacherId } = options;
    const { data } = await apiClient.get<ApiEnvelope<ParentMessage[]>>('/api/parent-messages', {
      params: { limit, offset, parentId, teacherId },
    });
    return data.data || [];
  } catch (err) {
    // log error and return empty list to avoid breaking the UI when server returns 500
    // caller may still want to know — we log here so developers can inspect console
    // eslint-disable-next-line no-console
    console.error('fetchParentMessages failed', err);
    return [];
  }
};

export const sendParentMessage = async (payload: { parentUserId: string; teacherUserId: string; senderRole: 'parent' | 'teacher'; subject: string; body: string; }) => {
  const { data } = await apiClient.post<ApiEnvelope<ParentMessage>>('/api/parent-messages', payload);
  return data.data;
};
