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
  const { data } = await apiClient.get<ApiEnvelope<ParentMessage[]>>('/api/parent-messages', { params: { limit, offset } });
  return data.data || [];
};

export const sendParentMessage = async (payload: { parentUserId: string; teacherUserId: string; studentId?: string | null; subject: string; body: string; }) => {
  const { data } = await apiClient.post<ApiEnvelope<ParentMessage>>('/api/parent-messages', payload);
  return data.data;
};
