import axios from 'axios';
import { env, hasAndroidSmsGatewayConfig, hasTwilioConfig } from '../config/environment';

export interface SmsGatewayHealth {
	provider: 'android-heartbeat' | 'twilio';
	configured: boolean;
	online: boolean;
	hasLoad: boolean;
	ready: boolean;
	details: string;
}

interface SmsGatewayTokenResponse {
	token_type?: string;
	access_token?: string;
	accessToken?: string;
	token?: string;
	expires_at?: string;
}

const normalizePhone = (phone: string): string => {
	const cleaned = phone.replace(/[^\d+]/g, '');
	if (cleaned.startsWith('+')) {
		return cleaned;
	}
	if (cleaned.startsWith('0')) {
		return `+63${cleaned.slice(1)}`;
	}
	if (cleaned.startsWith('63')) {
		return `+${cleaned}`;
	}
	return cleaned;
};

const isCloudSmsGateway = (): boolean => env.androidSmsGatewayUrl.includes('api.sms-gate.app');

let cloudSmsTemporarilyDisabledUntil = 0;

const isCloudSmsTemporarilyDisabled = (): boolean => Date.now() < cloudSmsTemporarilyDisabledUntil;

const disableCloudSmsTemporarily = (minutes = 15): void => {
	cloudSmsTemporarilyDisabledUntil = Date.now() + minutes * 60 * 1000;
};

const getGatewayBaseUrl = (): string => {
	try {
		const parsed = new URL(env.androidSmsGatewayUrl);
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return env.androidSmsGatewayUrl.replace(/\/3rdparty\/v1\/.+$/i, '');
	}
};

const getCloudSmsGatewayToken = async (): Promise<string | null> => {
	if (!env.androidSmsGatewayUsername || !env.androidSmsGatewayPassword) {
		return null;
	}

	try {
		const baseUrl = getGatewayBaseUrl();
		const response = await axios.post<SmsGatewayTokenResponse>(
			`${baseUrl}/3rdparty/v1/auth/token`,
			{
				ttl: 3600,
				scopes: ['messages:send', 'messages:read', 'devices:list'],
			},
			{
				auth: {
					username: env.androidSmsGatewayUsername,
					password: env.androidSmsGatewayPassword,
				},
				headers: {
					'Content-Type': 'application/json',
				},
				timeout: Math.max(1000, env.androidSmsHeartbeatTimeoutMs),
			}
		);

		return response.data.access_token ?? response.data.accessToken ?? response.data.token ?? null;
	} catch (error) {
		console.warn('[SMS] Failed to obtain cloud JWT token:', error instanceof Error ? error.message : error);
		return null;
	}
};

export const getSmsGatewayHealth = async (): Promise<SmsGatewayHealth> => {
	if (env.smsProvider === 'android-heartbeat') {
		if (isCloudSmsGateway() && isCloudSmsTemporarilyDisabled()) {
			return {
				provider: 'android-heartbeat',
				configured: true,
				online: false,
				hasLoad: false,
				ready: false,
				details: 'Cloud SMS gateway temporarily disabled after recent 503 responses.',
			};
		}

		if (!hasAndroidSmsGatewayConfig()) {
			return {
				provider: 'android-heartbeat',
				configured: false,
				online: false,
				hasLoad: false,
				ready: false,
				details: 'Android SMS gateway env values are missing.',
			};
		}

		if (isCloudSmsGateway()) {
			const token = await getCloudSmsGatewayToken();
			if (!token) {
				return {
					provider: 'android-heartbeat',
					configured: true,
					online: false,
					hasLoad: false,
					ready: false,
					details: 'Failed to generate cloud JWT token.',
				};
			}

			try {
				const response = await axios.get(`${getGatewayBaseUrl()}/3rdparty/v1/health`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
					timeout: Math.max(1000, env.androidSmsHeartbeatTimeoutMs),
				});
				const health = response.data as {
					status?: string;
					checks?: Record<string, { status?: string }>;
				};
				const online = String(health?.status ?? '').toLowerCase() === 'pass';
				return {
					provider: 'android-heartbeat',
					configured: true,
					online,
					hasLoad: online,
					ready: online,
					details: online ? 'Cloud SMS gateway is ready.' : 'Cloud SMS gateway health check failed.',
				};
			} catch (error) {
				return {
					provider: 'android-heartbeat',
					configured: true,
					online: false,
					hasLoad: false,
					ready: false,
					details: `Failed cloud health request: ${error instanceof Error ? error.message : 'unknown error'}`,
				};
			}
		}

		try {
			const headers = env.androidSmsGatewayApiKey
				? { Authorization: `Bearer ${env.androidSmsGatewayApiKey}` }
				: undefined;
			const heartbeatResponse = await axios.get(env.androidSmsHeartbeatUrl, {
				timeout: Math.max(1000, env.androidSmsHeartbeatTimeoutMs),
				headers,
			});
			const heartbeat = heartbeatResponse.data as {
				online?: boolean;
				hasLoad?: boolean;
				canSendSms?: boolean;
			};

			const online = heartbeat?.online === true;
			const hasLoad = heartbeat?.hasLoad === true;
			const ready = online && hasLoad && heartbeat?.canSendSms !== false;

			return {
				provider: 'android-heartbeat',
				configured: true,
				online,
				hasLoad,
				ready,
				details: ready
					? 'Android SMS gateway is online and ready.'
					: 'Android gateway reachable but not ready (offline/no load/canSendSms=false).',
			};
		} catch (error) {
			return {
				provider: 'android-heartbeat',
				configured: true,
				online: false,
				hasLoad: false,
				ready: false,
				details: `Failed heartbeat request: ${error instanceof Error ? error.message : 'unknown error'}`,
			};
		}
	}

	const configured = hasTwilioConfig();
	return {
		provider: 'twilio',
		configured,
		online: configured,
		hasLoad: true,
		ready: configured,
		details: configured ? 'Twilio credentials detected.' : 'Twilio credentials missing.',
	};
};

export const sendHeatAlertSms = async (
	phone: string,
	recipientName: string,
	heatLevel: string,
	heatIndex: number
): Promise<boolean> => {
	const to = normalizePhone(phone);
	if (!to) {
		return false;
	}

	const message = `Beat The Heat Alert for ${recipientName}: Heat level ${String(heatLevel).toUpperCase()} at ${heatIndex.toFixed(1)}C. Keep hydrated and follow school safety advisories.`;

	if (env.smsProvider === 'android-heartbeat') {
		const health = await getSmsGatewayHealth();
		if (!health.ready) {
			console.warn(`[SMS] Android SMS app not ready. ${health.details}`);
			return false;
		}

		try {
			if (isCloudSmsGateway()) {
				const token = await getCloudSmsGatewayToken();
				if (!token) {
					console.warn('[SMS] Cloud token unavailable.');
					return false;
				}

				const resp = await axios.post(
					`${getGatewayBaseUrl()}/3rdparty/v1/messages`,
					{
						phoneNumbers: [to],
						textMessage: { text: message },
					},
					{
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
						timeout: 15000,
					}
				);
				console.info('[SMS] Cloud send response:', resp?.status, resp?.data);
			} else {
				const headers = env.androidSmsGatewayApiKey
					? { Authorization: `Bearer ${env.androidSmsGatewayApiKey}` }
					: undefined;
				const auth = env.androidSmsGatewayUsername
					? { username: env.androidSmsGatewayUsername, password: env.androidSmsGatewayPassword }
					: undefined;
				const payload = { textMessage: { text: message }, phoneNumbers: [to], tag: 'heat-alert' };

				const resp = await axios.post(env.androidSmsGatewayUrl, payload, {
					headers,
					auth,
					timeout: 15000,
				});
				console.info('[SMS] Local send response:', resp?.status, resp?.data);
			}
			return true;
		} catch (error) {
			const status = axios.isAxiosError(error) ? error.response?.status : undefined;
			if (status === 503 && isCloudSmsGateway()) {
				disableCloudSmsTemporarily(15);
				console.warn('[SMS] Cloud SMS gateway is overloaded; temporarily disabling SMS dispatch for 15 minutes.');
				return false;
			}

			console.error('[SMS] Failed to send via Android heartbeat gateway:', status ? `HTTP ${status}` : error instanceof Error ? error.message : error);
			return false;
		}
	}

	if (!hasTwilioConfig()) {
		console.warn('[SMS] Twilio is not configured. Skipping SMS dispatch.');
		return false;
	}

	try {
		const form = new URLSearchParams();
		form.append('To', to);
		form.append('From', env.twilioPhoneNumber);
		form.append('Body', message);

		await axios.post(
			`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
			form,
			{
				auth: {
					username: env.twilioAccountSid,
					password: env.twilioAuthToken,
				},
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				timeout: 15000,
			}
		);

		return true;
	} catch (error) {
		console.error('[SMS] Failed to send heat alert SMS:', error);
		return false;
	}
};
