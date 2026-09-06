import { apiClient } from './api';
import type { ApiEnvelope } from './api';
import { getPreferredLang } from '../utils/lang';

export interface LoggedAdvisory {
	id: string;
	created_at: string;
	response: string;
	safety_level?: string;
	risk_level?: string;
	weather_snapshot?: unknown;
	confidence_score?: number;
	decision_basis?: {
		heatIndexC?: number;
		temperatureC?: number;
		humidityPercent?: number;
		heatLevel?: string;
		dataSource?: string;
		rationale?: string[];
	};
	model_profile?: {
		mode?: string;
		scope?: string;
	};
}

export interface ScopedAdvisoryResponse {
	summary: string;
	riskLevel: string;
	actions: string[];
	safetyTips: string[];
	scopeNote: string;
	singleResponse?: string;
	confidenceScore?: number;
	decisionBasis?: {
		heatIndexC?: number;
		temperatureC?: number;
		humidityPercent?: number;
		heatLevel?: string;
		dataSource?: string;
		rationale?: string[];
	};
	modelProfile?: {
		mode?: string;
		scope?: string;
	};
}

export interface RealtimeAdvisoryResponse extends ScopedAdvisoryResponse {
	generatedAt: string;
}

export interface ScopedAdvisoryOptions {
	lang?: 'english' | 'tagalog' | 'taglish';
	single?: boolean;
}

export const generateScopedAdvisory = async (
	query: string,
	options: ScopedAdvisoryOptions = {}
): Promise<ScopedAdvisoryResponse> => {
	const lang = options.lang ?? getPreferredLang();
	// retry wrapper with exponential backoff for transient timeouts
	const maxAttempts = 3;
	let attempt = 0;
	let lastErr: unknown;
	while (attempt < maxAttempts) {
		try {
			const { data } = await apiClient.post<ApiEnvelope<ScopedAdvisoryResponse>>(
				'/api/health-advisories/generate',
				{
					query,
					lang,
					single: options.single ?? false,
				}
			);
			return data.data;
		} catch (err) {
			lastErr = err;
			attempt += 1;
			const backoff = 300 * Math.pow(2, attempt); // 600ms, 1200ms, ...
			// only retry on network/timeout/5xx
			const status = (err as any)?.response?.status;
			const isRetryable = !status || (status >= 500 && status < 600) || (err as any)?.code === 'ECONNABORTED';
			if (!isRetryable || attempt >= maxAttempts) break;
			// small delay before retry
			// eslint-disable-next-line no-await-in-loop
			await new Promise((res) => setTimeout(res, backoff));
		}
	}
	// rethrow the last error for caller to handle
	throw lastErr;
};

export const fetchRealtimeAdvisory = async (): Promise<RealtimeAdvisoryResponse> => {
	// Retry wrapper for transient errors/timeouts
	const maxAttempts = 2;
	let attempt = 0;
	let lastErr: unknown;
	while (attempt < maxAttempts) {
		try {
			const { data } = await apiClient.get<ApiEnvelope<RealtimeAdvisoryResponse>>(
				'/api/health-advisories/realtime'
			);
			return data.data;
		} catch (err) {
			lastErr = err;
			attempt += 1;
			const status = (err as any)?.response?.status;
			const isRetryable = !status || (status >= 500 && status < 600) || (err as any)?.code === 'ECONNABORTED';
			if (!isRetryable || attempt >= maxAttempts) break;
			// backoff
			// eslint-disable-next-line no-await-in-loop
			await new Promise((res) => setTimeout(res, 500 * attempt));
		}
	}
	throw lastErr;
};

export const fetchHealthAdvisories = async (limit = 10, offset = 0): Promise<LoggedAdvisory[]> => {
	const { data } = await apiClient.get<ApiEnvelope<LoggedAdvisory[]>>('/api/health-advisories', {
		params: { limit, offset },
	});

	return data.data ?? [];
};
