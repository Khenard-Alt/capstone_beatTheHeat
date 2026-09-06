import axios from 'axios';

// In production we want the frontend to call the same origin under `/api` so
// nginx (or any reverse proxy) can route requests to the backend service.
// During development we default to the local backend at http://localhost:5000.
const DEV_DEFAULT = 'http://localhost:5000';
const baseURL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '/api' : DEV_DEFAULT);

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
