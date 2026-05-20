import { Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { aiAnalysisService } from '../services/aiAnalysis.service';
import { weatherService } from '../services/weather.service';
import { getSupabaseAdminClient } from '../config/supabase';
import { AdvisoryInput } from '../types';

type AdvisoryDecisionBasis = {
	heatIndexC?: number;
	temperatureC?: number;
	humidityPercent?: number;
	heatLevel?: string;
	dataSource?: string;
	rationale?: string[];
};

type AdvisoryModelProfile = {
	mode?: string;
	scope?: string;
};

type AdvisoryRow = {
	id: string;
	type?: string;
	created_at?: string | null;
	createdAt?: string | null;
	ai_response?: unknown;
	aiResponse?: unknown;
	weather_snapshot?: any;
	payload?: any;
};

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
	decisionBasis?: AdvisoryDecisionBasis;
	modelProfile?: AdvisoryModelProfile;
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

const normalizeTimestamp = (maybeTs?: string | null): string | null => {
	if (!maybeTs) return null;
	const parsed = new Date(maybeTs);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toISOString();
};

const normalizeWeatherSnapshot = (raw: any) => {
	if (!raw) return null;
	// Prefer explicit known fields but otherwise return as-is
	const heatLevel = raw.heatLevel ?? raw.heat_level ?? raw.level ?? raw?.weather?.heatLevel ?? 'normal';
	return {
		...raw,
		heatLevel,
	};
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
					return JSON.parse(line) as AdvisoryRow | null;
				} catch {
					return null;
				}
			})
			.filter((event) => event && (event.type === 'ai_analysis' || event.type === 'ai-analysis' || event.type === 'ai_analysis_v1'))
			.map((event) => {
				// Support multiple possible key names for created timestamp and response
				const created = normalizeTimestamp((event as any).created_at ?? (event as any).createdAt ?? (event as any).timestamp ?? null);
				const payload = (event as any).payload ?? (event as any).data ?? null;
				const responseText =
					(payload && (payload.ai_response ?? payload.responseText ?? payload.aiResponse ?? payload.response)) ??
					(event as any).ai_response ??
					(event as any).aiResponse ??
					null;

				const weatherSnapshot = normalizeWeatherSnapshot(payload?.weather ?? payload?.weather_snapshot ?? (event as any).weather_snapshot ?? null);

				const heatLevel = String(weatherSnapshot?.heatLevel ?? 'normal');

				return {
					id: (event as any).id ?? null,
					created_at: created,
					response: typeof responseText === 'string' ? responseText : JSON.stringify(responseText ?? 'No advisory text available'),
					safety_level: heatLevel,
					risk_level: mapRiskLevel(heatLevel),
					weather_snapshot: weatherSnapshot,
				};
			})
			.filter(Boolean)
			.sort((a, b) => {
				const at = a.created_at ? new Date(a.created_at).getTime() : 0;
				const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
				return bt - at;
			});

		return advisories.slice(offset, offset + limit);
	} catch (err) {
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
		const rawLang = req.body?.lang as string | undefined;
		const allowedLangs = ['english', 'tagalog', 'taglish', 'en', 'tl'] as const;
		const langParam = rawLang && (allowedLangs as readonly string[]).includes(rawLang) ? (rawLang as AdvisoryInput['lang']) : undefined;
		const singleParam = req.body?.single === true || String(req.body?.single ?? '') === 'true';

		const advisory = await aiAnalysisService.generateScopedAdvisory({
			query,
			weather,
			lang: langParam,
			single: singleParam,
		});

		res.status(200).json({
			success: true,
			data: advisory,
		});
	} catch (error) {
		next(error);
	}
};

export const getRealtimeAdvisory = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const query = typeof req.query?.query === 'string' ? req.query.query : 'Realtime heat advisory update.';
		const weather = await weatherService.getCurrentWeather();
		const rawLangQ = typeof req.query?.lang === 'string' ? req.query.lang : undefined;
		const langParam = rawLangQ && (['english', 'tagalog', 'taglish', 'en', 'tl'] as readonly string[]).includes(rawLangQ) ? (rawLangQ as AdvisoryInput['lang']) : undefined;
		const singleParam = String(req.query?.single ?? '') === 'true';
		const advisory = await aiAnalysisService.generatePythonOnlyAdvisory({
			query,
			weather,
			lang: langParam,
			single: singleParam,
		});

		res.status(200).json({
			success: true,
			data: {
				...advisory,
				generatedAt: new Date().toISOString(),
			},
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
				error: (error as any)?.message ?? String(error),
			});
			return;
		}

		// Fallback: if Supabase didn't return a count, request a head-only count query
		let totalCount: number = typeof count === 'number' && Number.isFinite(count) ? count : 0;
		if (totalCount === 0) {
			try {
				const countResp: any = await client.from('ai_analysis_logs').select('id', { count: 'exact', head: true });
				if (typeof countResp.count === 'number') {
					totalCount = countResp.count;
				}
			} catch {
				// ignore fallback errors and keep totalCount as-is
			}
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
				total: totalCount || 0,
			},
		});
	} catch (error) {
		next(error);
	}
};
