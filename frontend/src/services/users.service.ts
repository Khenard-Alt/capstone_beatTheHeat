import { apiClient } from './api';

export interface AppUser {
	id: string;
	email: string;
	role: string;
	firstName: string;
	lastName: string;
	phone?: string | null;
	schoolId?: string | null;
	avatarUrl?: string | null;
}

export const fetchUsersByRole = async (role: string): Promise<AppUser[]> => {
	const { data } = await apiClient.get<{ success: boolean; users?: AppUser[] }>(`/api/users`, {
		params: { role },
	});

	return data.users ?? [];
};

export const uploadUserAvatar = async (userId: string, file: File): Promise<AppUser> => {
	const formData = new FormData();
	formData.append('avatar', file);

	const { data } = await apiClient.post<{ success: boolean; message?: string; user?: AppUser }>(
		`/api/users/${userId}/avatar`,
		formData,
		// Let axios auto-generate the multipart boundary — explicitly overriding
		// the client's default 'application/json' header would send the file
		// without a boundary and break parsing on the server.
		{ headers: { 'Content-Type': undefined } }
	);

	if (!data.success || !data.user) {
		throw new Error(data.message || 'Failed to upload profile picture.');
	}

	return data.user;
};