import axios from 'axios';

// In production we want the frontend to call the same origin under `/api` so
// nginx (or any reverse proxy) can route requests to the backend service.
// During development we default to the local backend at http://localhost:5000.
const DEV_DEFAULT = 'http://localhost:5000';

// VS Code Dev Tunnels expose each forwarded port as its own subdomain, e.g.
// a frontend at https://<id>-5173.<region>.devtunnels.ms and the backend at
// https://<id>-5000.<region>.devtunnels.ms — same tunnel id/region, just the
// port swapped in. Detecting this at runtime means the page works whether
// it's opened via localhost or via the (frequently-changing) tunnel URL,
// without editing VITE_API_BASE_URL by hand every time the tunnel restarts.
const resolveDevTunnelBackendUrl = (): string | null => {
	const { hostname, protocol } = window.location;
	const match = hostname.match(/^(.+)-\d+\.(.+\.devtunnels\.ms)$/);
	if (!match) return null;

	const [, tunnelId, suffix] = match;
	return `${protocol}//${tunnelId}-5000.${suffix}`;
};

const baseURL =
	import.meta.env.VITE_API_BASE_URL ??
	(import.meta.env.PROD ? '/api' : resolveDevTunnelBackendUrl() ?? DEV_DEFAULT);

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
