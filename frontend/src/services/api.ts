import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export const apiClient = axios.create({
	baseURL,
	timeout: 15000,
	headers: {
		'Content-Type': 'application/json',
	},
});

export interface ApiEnvelope<T> {
	success: boolean;
	data: T;
	message?: string;
}
