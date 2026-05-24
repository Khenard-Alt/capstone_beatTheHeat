import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface ParentMessage {
  id: string;
  parent_user_id?: string;
  teacher_user_id?: string;
  student_id?: string | null;
  subject: string;
  body: string;
  created_at?: string;
}

export const fetchParentMessages = async (limit = 20, offset = 0): Promise<ParentMessage[]> => {
  try {
    const { data } = await apiClient.get<ApiEnvelope<ParentMessage[]>>('/api/parent-messages', { params: { limit, offset } });
    return data.data || [];
  } catch (err) {
    // log error and return empty list to avoid breaking the UI when server returns 500
    // caller may still want to know — we log here so developers can inspect console
    // eslint-disable-next-line no-console
    console.error('fetchParentMessages failed', err);
    return [];
  }
};

export const sendParentMessage = async (payload: { parentUserId: string; teacherUserId: string; studentId?: string | null; subject: string; body: string; }) => {
  const { data } = await apiClient.post<ApiEnvelope<ParentMessage>>('/api/parent-messages', payload);
  return data.data;
};
