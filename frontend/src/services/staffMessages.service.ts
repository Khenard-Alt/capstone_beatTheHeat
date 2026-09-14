import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface StaffMessage {
	id: string;
	sender_id: string;
	recipient_id: string;
	subject: string;
	body: string;
	created_at?: string;
}

export const fetchStaffMessages = async (options: { limit?: number; offset?: number; userId: string; peerId?: string }): Promise<StaffMessage[]> => {
	try {
		const { limit = 100, offset = 0, userId, peerId } = options;
		const { data } = await apiClient.get<ApiEnvelope<StaffMessage[]>>('/api/staff-messages', {
			params: { limit, offset, userId, peerId },
		});
		return data.data || [];
	} catch (err) {
		console.error('fetchStaffMessages failed', err);
		return [];
	}
};

export const sendStaffMessage = async (payload: { senderId: string; recipientId: string; subject: string; body: string }) => {
	const { data } = await apiClient.post<ApiEnvelope<StaffMessage>>('/api/staff-messages', payload);
	return data.data;
};
