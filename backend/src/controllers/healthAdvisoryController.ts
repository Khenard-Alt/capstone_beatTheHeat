import { Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { aiAnalysisService } from '../services/aiAnalysis.service';
import { weatherService } from '../services/weather.service';
import { getSupabaseAdminClient } from '../config/supabase';

const formatLoggedAdvisoryResponse = (aiResponse: unknown): string => {
	if (typeof aiResponse !== 'string') {
		return 'No advisory text available';
	}

	try {
		const parsed = JSON.parse(aiResponse) as {
			summary?: string;
			actions?: string[];
			scopeNote?: string;
		};

		const actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [];
		return [
			parsed.summary ?? 'No advisory summary available',
			...actions.map((action) => `- ${action}`),
			parsed.scopeNote ?? 'System-scoped heat advisory response.',
		]
			.filter(Boolean)
			.join('\n');
	} catch {
		return aiResponse;
	}
};

const parseAiAdvisoryPayload = (aiResponse: unknown): {
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
} => {
	if (typeof aiResponse !== 'string') {
		return {};
	}

	try {
		const parsed = JSON.parse(aiResponse) as {
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
		};

		return {
			confidenceScore:
				typeof parsed.confidenceScore === 'number' && Number.isFinite(parsed.confidenceScore)
					? parsed.confidenceScore
					: undefined,
			decisionBasis: parsed.decisionBasis
				? {
					heatIndexC:
						typeof parsed.decisionBasis.heatIndexC === 'number'
							? parsed.decisionBasis.heatIndexC
							: undefined,
					temperatureC:
						typeof parsed.decisionBasis.temperatureC === 'number'
							? parsed.decisionBasis.temperatureC
							: undefined,
					humidityPercent:
						typeof parsed.decisionBasis.humidityPercent === 'number'
							? parsed.decisionBasis.humidityPercent
							: undefined,
					heatLevel:
						typeof parsed.decisionBasis.heatLevel === 'string'
							? parsed.decisionBasis.heatLevel
							: undefined,
					dataSource:
						typeof parsed.decisionBasis.dataSource === 'string'
							? parsed.decisionBasis.dataSource
							: undefined,
					rationale: Array.isArray(parsed.decisionBasis.rationale)
						? parsed.decisionBasis.rationale.map(String).slice(0, 5)
						: undefined,
				}
				: undefined,
			modelProfile: parsed.modelProfile,
		};
	} catch {
		return {};
	}
};

const mapRiskLevel = (heatLevel: string): 'low' | 'medium' | 'high' | 'critical' => {
	if (heatLevel === 'danger' || heatLevel === 'extreme-danger') {
		return 'critical';
	}

	if (heatLevel === 'extreme-caution') {
		return 'high';
	}

	if (heatLevel === 'caution') {
		return 'medium';
	}

	return 'low';
};

const loadLocalAdvisories = async (limit: number, offset: number): Promise<any[]> => {
	const auditPath = path.resolve(process.cwd(), 'logs', 'audit-events.jsonl');

	try {
		const raw = await readFile(auditPath, 'utf-8');
		const advisories = raw
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter((event) => event && event.type === 'ai_analysis' && event.payload)
			.map((event) => {
				const heatLevel = String(event.payload?.weather?.heatLevel ?? 'normal');
				return {
					id: event.id,
					created_at: event.createdAt,
					response: event.payload?.responseText ?? 'No advisory text available',
					safety_level: heatLevel,
					risk_level: mapRiskLevel(heatLevel),
				};
			})
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

		return advisories.slice(offset, offset + limit);
	} catch {
		return [];
	}
};

export const generateHealthAdvisory = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const query = typeof req.body?.query === 'string' ? req.body.query : '';
		const weather = req.body?.weather ?? (await weatherService.getCurrentWeather());

		const advisory = await aiAnalysisService.generateScopedAdvisory({
			query,
			weather,
		});

		res.status(200).json({
			success: true,
			data: advisory,
		});
	} catch (error) {
		next(error);
	}
};

export const getHealthAdvisories = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const limit = parseInt(req.query.limit as string) || 10;
		const offset = parseInt(req.query.offset as string) || 0;

		const client = getSupabaseAdminClient();
		if (!client) {
			const local = await loadLocalAdvisories(limit, offset);
			res.status(200).json({
				success: true,
				message: 'Serving local advisory cache (database not configured)',
				data: local,
				pagination: {
					limit,
					offset,
					total: local.length,
				},
			});
			return;
		}

		const { data, error, count } = await client
			.from('ai_analysis_logs')
			.select('id, created_at, ai_response, weather_snapshot', { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to fetch advisories',
				error: error.message,
			});
			return;
		}

		res.status(200).json({
			success: true,
			data: (data || []).map((row: any) => {
				const parsed = parseAiAdvisoryPayload(row.ai_response);
				return {
					id: row.id,
					created_at: row.created_at,
					response: formatLoggedAdvisoryResponse(row.ai_response),
					safety_level: row.weather_snapshot?.heatLevel ?? parsed.decisionBasis?.heatLevel ?? 'normal',
					weather_snapshot: row.weather_snapshot ?? null,
					confidence_score: parsed.confidenceScore,
					decision_basis: parsed.decisionBasis,
					model_profile: parsed.modelProfile,
				};
			}),
			pagination: {
				limit,
				offset,
				total: count || 0,
			},
		});
	} catch (error) {
		next(error);
	}
};
