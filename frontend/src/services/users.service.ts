import { apiClient } from './api';

export interface AppUser {
	id: string;
	email: string;
	role: string;
	firstName: string;
	lastName: string;
	phone?: string | null;
	schoolId?: string | null;
}

export const fetchUsersByRole = async (role: string): Promise<AppUser[]> => {
	const { data } = await apiClient.get<{ success: boolean; users?: AppUser[] }>(`/api/users`, {
		params: { role },
	});

	return data.users ?? [];
};