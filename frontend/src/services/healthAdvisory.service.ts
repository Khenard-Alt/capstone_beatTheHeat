import { apiClient } from './api';
import type { ApiEnvelope } from './api';

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
	const { data } = await apiClient.post<ApiEnvelope<ScopedAdvisoryResponse>>(
		'/api/health-advisories/generate',
		{
			query,
			lang: options.lang,
			single: options.single ?? false,
		}
	);

	return data.data;
};

export const fetchRealtimeAdvisory = async (): Promise<RealtimeAdvisoryResponse> => {
	const { data } = await apiClient.get<ApiEnvelope<RealtimeAdvisoryResponse>>(
		'/api/health-advisories/realtime'
	);

	return data.data;
};

export const fetchHealthAdvisories = async (limit = 10, offset = 0): Promise<LoggedAdvisory[]> => {
	const { data } = await apiClient.get<ApiEnvelope<LoggedAdvisory[]>>('/api/health-advisories', {
		params: { limit, offset },
	});

	return data.data ?? [];
};
