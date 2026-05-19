import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface ScopedAdvisoryResponse {
	summary: string;
	riskLevel: string;
	actions: string[];
	safetyTips: string[];
	scopeNote: string;
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

export const generateScopedAdvisory = async (query: string): Promise<ScopedAdvisoryResponse> => {
	const { data } = await apiClient.post<ApiEnvelope<ScopedAdvisoryResponse>>(
		'/api/health-advisories/generate',
		{
			query,
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
