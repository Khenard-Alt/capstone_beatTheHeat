import { apiClient } from './api';
import type { ApiEnvelope } from './api';

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
