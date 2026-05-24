import axios from 'axios';
import { execFile } from 'child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { env, hasGeminiApiKey } from '../config/environment';
import { AdvisoryInput, AdvisoryResult, WeatherForecastDay } from '../types';
import { auditLogService } from './auditLog.service';
import { projectPolicyFAQ } from '../knowledge/projectPolicyFAQ';
import { weatherService } from './weather.service';

interface GeminiResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
	usageMetadata?: {
		promptTokenCount?: number;
		candidatesTokenCount?: number;
		totalTokenCount?: number;
	};
}

type LanguageStyle = 'english' | 'tagalog' | 'taglish';
type ConversationIntent =
	| 'greeting'
	| 'thanks'
	| 'capability'
	| 'forecast'
	| 'urgent-symptoms'
	| 'hydration'
	| 'what-to-bring'
	| 'outdoor-safety'
	| 'suspension'
	| 'school-status'
	| 'general';
type AdvisoryPayload = Partial<AdvisoryResult> & {
		symptoms?: string[];
		triagePriority?: string;
		triage?: string;
		teacherChecklist?: string[];
		clinicActions?: string[];
		parentChecklist?: string[];
		recommendedFluids?: string;
		fluids?: string;
		coolingProcedures?: string[];
		whenToEscalate?: string;
		sampleAnnouncementText?: string;
		announcement?: string;
};
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite'];
const execFileAsync = promisify(execFile);

class AIAnalysisService {
	private knowledgeCache: { handbook: string | null; docs: Map<string, string> } | null = null;
	private geminiDisabledUntil = 0;

	private maybeAttachSingle(result: AdvisoryResult, input?: any): AdvisoryResult {
		try {
			if (input && input.single) {
				result.singleResponse = result.summary;
			}
		} catch {
			// noop
		}
		return result;
	}

	private isGeminiTemporarilyDisabled(): boolean {
		return Date.now() < this.geminiDisabledUntil;
	}

	private disableGeminiTemporarily(minutes = 5): void {
		this.geminiDisabledUntil = Date.now() + minutes * 60 * 1000;
	}

	private buildProjectFailAdvisory(input: AdvisoryInput, languageStyle: LanguageStyle): AdvisoryResult {
		const base = this.safeScopeRedirect(input.weather.heatLevel, languageStyle);
		if (languageStyle === 'tagalog' || languageStyle === 'taglish') {
			return {
				...base,
				summary: "Worry not — hindi ako takdang-aralin na magbibigay grade. Kung natatakot ka, huminga muna; humingi ng feedback sa adviser; at mag-ayos ng plan. Kaya mo 'yan! 😄",
				actions: [
					"Humingi ng konkretong feedback mula sa adviser ngayong araw.",
					"Gumawa ng maliit na plan: prioritize tasks at mag-assign ng oras araw-araw.",
					"Mag-practice ng demo o presentation kasama ang kaibigan para confident ka."
				],
				safetyTips: [
					"Huwag mag-cram — mas epektibo ang steady progress.",
					"Kumain at magpahinga para malinaw ang isip bago mag-review."
				],
				scopeNote: "Lighthearted, non-evaluative support for student project concerns.",
				confidenceScore: 0.5,
				decisionBasis: {
					heatIndexC: input.weather.heatIndexC,
					temperatureC: input.weather.temperatureC,
					humidityPercent: input.weather.humidityPercent,
					heatLevel: input.weather.heatLevel,
					dataSource: input.weather.source,
					rationale: [
						"User requested a lighthearted, non-evaluative reply about project failure.",
					],
				},
				modelProfile: { mode: 'rule-grounded-ai', scope: 'system-only' },
			};
		}

		return {
			...base,
			summary: "Relax — I'm not the thesis police. You're probably fine. Breathe, ask your adviser for feedback, and take it step by step. You got this! 😄",
			actions: [
				"Ask your adviser for specific feedback and next steps.",
				"Break the remaining work into small tasks and set short deadlines.",
				"Do a mock presentation to build confidence."
			],
			safetyTips: [
				"Avoid last-minute cramming — rest helps focus.",
				"Eat and hydrate before any defense or demo."
			],
			scopeNote: "Lighthearted, non-evaluative support for project concerns.",
			confidenceScore: 0.5,
			decisionBasis: {
				heatIndexC: input.weather.heatIndexC,
				temperatureC: input.weather.temperatureC,
				humidityPercent: input.weather.humidityPercent,
				heatLevel: input.weather.heatLevel,
				dataSource: input.weather.source,
				rationale: [
					"User requested a lighthearted, non-evaluative reply about project failure.",
				],
			},
			modelProfile: { mode: 'rule-grounded-ai', scope: 'system-only' },
		};
	}

	public async generateScopedAdvisory(input: AdvisoryInput): Promise<AdvisoryResult> {
		const rawQuery = typeof input.query === 'string' ? input.query : '';
		const scopedQuery = this.scopeUserQuery(rawQuery);
		// Respect explicit language request if provided, otherwise detect from query
		const languageStyle = input.lang
			? (input.lang === 'tagalog' || input.lang === 'tl'
				? 'tagalog'
				: input.lang === 'taglish'
				? 'taglish'
				: 'english')
			: this.detectLanguageStyle(rawQuery || scopedQuery);
		const intent = this.detectConversationIntent(rawQuery);

		// Early shortcut: if user asks about failing a capstone/thesis/project,
		// return a playful, supportive fallback immediately so it's not overridden
		// by heat-safety templates.
		const qLower = rawQuery.toLowerCase();
		const isProjectMention = /capstone|thesis|project/.test(qLower);
		const isFailMention = /bagsak|fail|flunk|pasa|pumalya/.test(qLower);
		if (isProjectMention && isFailMention) {
			const projectResp = this.buildProjectFailAdvisory(input, languageStyle);
			await this.logAdvisoryAudit(input, scopedQuery, projectResp, 'fallback', 'project-fallback');
			return this.maybeAttachSingle(projectResp, input);
		}
		const variationSeed = this.getVariationSeed();

		if (this.classifyScope(rawQuery) === 'out-of-scope') {
			const refusal = this.buildScopeRefusalAdvisory(input.weather, languageStyle);
			const variedRefusal = this.applyVariation(refusal, variationSeed, languageStyle);
			await this.logAdvisoryAudit(input, scopedQuery, variedRefusal, 'fallback', 'scope-guard');
			return this.maybeAttachSingle(variedRefusal, input);
		}

		if (intent === 'forecast') {
			const forecastData = await weatherService.getForecastOutlook(7);
			const forecastAdvisory = this.buildForecastAdvisory(forecastData.days, languageStyle, forecastData.mode);
			const adjustedForecast = this.applyQueryPolicy(forecastAdvisory, input, scopedQuery, languageStyle);
			const variedForecast = this.applyVariation(adjustedForecast, variationSeed, languageStyle);
			const filledForecast = this.fillHealthDefaults(variedForecast, input.weather);
			await this.logAdvisoryAudit(input, scopedQuery, filledForecast, 'fallback', 'forecast-openweather');
			return this.maybeAttachSingle(filledForecast, input);
		}

		let scenarioTemplate = this.buildScenarioTemplateAdvisory(intent, input.weather, languageStyle);

		// If the user explicitly requests a highly detailed or health-focused advisory,
		// prefer the AI model output over the short scenario template to allow expanded content.
		const rawLower = scopedQuery.toLowerCase();
		if (rawLower.includes('detailed') || rawLower.includes('health-focused') || rawLower.includes('long') || rawLower.includes('expand')) {
			scenarioTemplate = null;
		}
		if (scenarioTemplate) {
			const variedTemplate = this.applyVariation(scenarioTemplate, variationSeed, languageStyle);
			const filled = this.fillHealthDefaults(variedTemplate, input.weather);
			await this.logAdvisoryAudit(input, scopedQuery, filled, 'fallback', 'intent-template');
			return this.maybeAttachSingle(filled, input);
		}

		if (env.aiModelProvider === 'fallback') {
			const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
			const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
			const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
			await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', 'fallback-only');
			return this.maybeAttachSingle(variedFallback, input);
		}

		const ensembleResult = await this.generateEnsembleAdvisory(input, scopedQuery, languageStyle, variationSeed, env.aiModelProvider);
		if (ensembleResult) {
			return this.maybeAttachSingle(ensembleResult, input);
		}

		const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
		const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
		const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
		await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', 'fallback-only');
		return this.maybeAttachSingle(variedFallback, input);
	}

	public async generatePythonOnlyAdvisory(input: AdvisoryInput): Promise<AdvisoryResult> {
		const rawQuery = typeof input.query === 'string' ? input.query : '';
		const scopedQuery = this.scopeUserQuery(rawQuery);
		const languageStyle = input.lang
			? (input.lang === 'tagalog' || input.lang === 'tl'
				? 'tagalog'
				: input.lang === 'taglish'
				? 'taglish'
				: 'english')
			: this.detectLanguageStyle(rawQuery || scopedQuery);
		const variationSeed = this.getVariationSeed();

		if (this.classifyScope(rawQuery) === 'out-of-scope') {
			const refusal = this.buildScopeRefusalAdvisory(input.weather, languageStyle);
			const variedRefusal = this.applyVariation(refusal, variationSeed, languageStyle);
			await this.logAdvisoryAudit(input, scopedQuery, variedRefusal, 'fallback', 'scope-guard');
			return this.maybeAttachSingle(variedRefusal, input);
		}

		const pythonResult = await this.generatePythonAdvisory(input, scopedQuery, languageStyle, variationSeed);
		if (pythonResult) {
			return this.maybeAttachSingle(pythonResult, input);
		}

		const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
		const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
		const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
		await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', 'python-fallback');
		return this.maybeAttachSingle(variedFallback, input);
	}

	private async requestGeminiContent(
		requestBody: Record<string, unknown>
	): Promise<{ data: GeminiResponse; modelUsed: string }> {
		let lastError: unknown;

		for (const model of GEMINI_MODELS) {
			try {
				const { data } = await axios.post<GeminiResponse>(
					`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.googleGeminiApiKey}`,
					requestBody,
					{
						headers: {
							'Content-Type': 'application/json',
						},
						timeout: 15000,
					}
				);

				return { data, modelUsed: model };
			} catch (error) {
				lastError = error;
				if (axios.isAxiosError(error)) {
					const status = error.response?.status;
					const message =
						typeof error.response?.data === 'string'
							? error.response.data
							: JSON.stringify(error.response?.data ?? {});
					console.error(`Gemini model ${model} failed with status ${status ?? 'N/A'}: ${message}`);
					if (status === 429) {
						this.disableGeminiTemporarily(5);
					}
				} else {
					console.error(`Gemini model ${model} failed with non-axios error`, error);
				}
			}
		}

		throw lastError ?? new Error('All configured Gemini models failed.');
	}

	private async logAdvisoryAudit(
		input: AdvisoryInput,
		scopedQuery: string,
		result: AdvisoryResult,
		source: 'gemini' | 'fallback' | 'python' | 'ensemble',
		model: string,
		tokenInput?: number,
		tokenOutput?: number,
		tokenTotal?: number
	): Promise<void> {
		const responseText = JSON.stringify(result);
		const estimatedCostUsd = tokenTotal ? this.estimateCostUsd(tokenTotal) : undefined;

		try {
			await auditLogService.logAiAnalysis({
				query: scopedQuery,
				weather: input.weather,
				model,
				responseText,
				tokenInput,
				tokenOutput,
				tokenTotal,
				estimatedCostUsd,
				source,
			});
		} catch (error) {
			console.error('Failed to persist ai advisory audit log:', error);
		}
	}

	private estimateCostUsd(_totalTokens: number): number {
		// Google Gemini: completely FREE on free tier
		// This is kept for compatibility; cost is always 0
		return 0;
	}

	private async generateEnsembleAdvisory(
		input: AdvisoryInput,
		scopedQuery: string,
		languageStyle: LanguageStyle,
		variationSeed: number,
		preferredProvider: 'gemini' | 'python'
	): Promise<AdvisoryResult | null> {
		const [pythonResult, geminiResult] = await Promise.allSettled([
			this.generatePythonAdvisory(input, scopedQuery, languageStyle, variationSeed, true),
			this.isGeminiTemporarilyDisabled()
				? Promise.resolve(null)
				: this.generateGeminiAdvisory(input, scopedQuery, languageStyle, variationSeed, true),
		]);

		const pythonAdvisory = pythonResult.status === 'fulfilled' ? pythonResult.value : null;
		const geminiAdvisory = geminiResult.status === 'fulfilled' ? geminiResult.value?.result ?? null : null;

		if (!pythonAdvisory && !geminiAdvisory) {
			return null;
		}

		if (pythonAdvisory && !geminiAdvisory) {
			const result = this.applySafetyRules(pythonAdvisory, input.weather);
			await this.logAdvisoryAudit(input, scopedQuery, result, 'python', 'ensemble-python-only');
			return result;
		}

		if (!pythonAdvisory && geminiAdvisory) {
			const result = this.applySafetyRules(geminiAdvisory, input.weather);
			await this.logAdvisoryAudit(input, scopedQuery, result, 'gemini', 'ensemble-gemini-only');
			return result;
		}

		const merged = this.mergeAdvisoryResults(
			pythonAdvisory!,
			geminiAdvisory!,
			input,
			preferredProvider
		);
		const finalMerged = this.applySafetyRules(merged, input.weather);
		await this.logAdvisoryAudit(input, scopedQuery, finalMerged, 'ensemble', `ensemble:${preferredProvider}+${preferredProvider === 'python' ? 'gemini' : 'python'}`);
		return finalMerged;
	}

	private async generateGeminiAdvisory(
		input: AdvisoryInput,
		scopedQuery: string,
		languageStyle: LanguageStyle,
		variationSeed: number,
		skipAudit = false
	): Promise<{ result: AdvisoryResult; modelUsed: string; tokenInput?: number; tokenOutput?: number; tokenTotal?: number } | null> {
		if (!hasGeminiApiKey()) {
			return null;
		}

		if (this.isGeminiTemporarilyDisabled()) {
			return null;
		}

		try {
			const knowledgeContext = await this.buildKnowledgeContext(scopedQuery);
			const systemPrompt = this.systemPrompt(knowledgeContext);
			const userPrompt = JSON.stringify({
				query: scopedQuery,
				languageStyle,
				weather: input.weather,
				variationHint: this.buildVariationHint(variationSeed, languageStyle),
			});

			const requestBody = {
				contents: [
					{
						parts: [
							{ text: systemPrompt },
							{ text: `USER REQUEST:\n${userPrompt}\n\nRespond with valid JSON only (no markdown, no code blocks).` },
						],
					},
				],
				generationConfig: {
					temperature: 0.2,
					maxOutputTokens: 1600,
					responseMimeType: 'application/json',
				},
			};

			if (process.env.NODE_ENV !== 'production') {
				try {
					console.log('[AI DEBUG] System prompt preview:', systemPrompt.slice(0, 400));
					console.log('[AI DEBUG] User prompt payload:', userPrompt);
				} catch {
					// ignore logging errors
				}
			}

			const { data, modelUsed } = await this.requestGeminiContent(requestBody);
			const parts = data?.candidates?.[0]?.content?.parts ?? [];
			const content = parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('\n').trim();
			const parsed = this.parseAdvisory(content, input.weather, languageStyle);

			if (process.env.NODE_ENV !== 'production') {
				try {
					console.log('[AI DEBUG] Raw model content:', content.slice(0, 800));
					console.log('[AI DEBUG] Parsed advisory:', JSON.stringify(parsed));
				} catch {
					// ignore logging errors
				}
			}

			const result = this.enforceOutputScope(parsed, input.weather.heatLevel, languageStyle);
			const adjustedResult = this.applyQueryPolicy(result, input, scopedQuery, languageStyle);
			const variedResult = this.applyVariation(adjustedResult, variationSeed, languageStyle);
			const finalResult = this.fillHealthDefaults(variedResult, input.weather);

			if (!skipAudit) {
				await this.logAdvisoryAudit(
					input,
					scopedQuery,
					finalResult,
					'gemini',
					modelUsed,
					data.usageMetadata?.promptTokenCount,
					data.usageMetadata?.candidatesTokenCount,
					data.usageMetadata?.totalTokenCount
				);
			}

			return {
				result: finalResult,
				modelUsed,
				tokenInput: data.usageMetadata?.promptTokenCount,
				tokenOutput: data.usageMetadata?.candidatesTokenCount,
				tokenTotal: data.usageMetadata?.totalTokenCount,
			};
		} catch (error) {
			console.error('Gemini advisory generation failed:', error);
			return null;
		}
	}

	private mergeAdvisoryResults(
		pythonResult: AdvisoryResult,
		geminiResult: AdvisoryResult,
		input: AdvisoryInput,
		preferredProvider: 'gemini' | 'python'
	): AdvisoryResult {
		const riskLevel = this.pickHigherRiskLevel(pythonResult.riskLevel, geminiResult.riskLevel, input.weather.heatLevel);
		const preferred = preferredProvider === 'python' ? pythonResult : geminiResult;
		const secondary = preferredProvider === 'python' ? geminiResult : pythonResult;
		const winner = (secondary.confidenceScore ?? 0) > (preferred.confidenceScore ?? 0) ? secondary : preferred;
		const confidenceScore = Math.min(
			0.99,
			Math.max(preferred.confidenceScore ?? 0, secondary.confidenceScore ?? 0, 0.82) + 0.03
		);
		const mergedActions = this.mergeStringLists(preferred.actions, secondary.actions, 5);
		const mergedSafetyTips = this.mergeStringLists(preferred.safetyTips, secondary.safetyTips, 5);
		const mergedHealthDetails = this.mergeHealthDetails(preferred.healthDetails, secondary.healthDetails);
		const rationale = this.mergeStringLists(
			preferred.decisionBasis.rationale,
			secondary.decisionBasis.rationale,
			5
		);

		return this.fillHealthDefaults(
			{
				summary: winner.summary,
				riskLevel,
				actions: mergedActions,
				safetyTips: mergedSafetyTips,
				scopeNote: this.mergeScopeNotes(preferred.scopeNote, secondary.scopeNote),
				confidenceScore,
				decisionBasis: {
					heatIndexC: input.weather.heatIndexC,
					temperatureC: input.weather.temperatureC,
					humidityPercent: input.weather.humidityPercent,
					heatLevel: input.weather.heatLevel,
					dataSource: input.weather.source,
					rationale: rationale.length > 0 ? rationale : [preferred.decisionBasis.rationale?.[0] ?? secondary.decisionBasis.rationale?.[0] ?? 'Live weather data was used to generate this advisory.'],
				},
				modelProfile: {
					mode: 'rule-grounded-ai',
					scope: 'system-only',
				},
				healthDetails: mergedHealthDetails,
				singleResponse: winner.singleResponse ?? winner.summary,
			},
			input.weather
		);
	}

	private mergeScopeNotes(primary?: string, secondary?: string): string {
		return this.mergeStringLists([primary ?? ''], [secondary ?? ''], 2).filter(Boolean).join(' ');
	}

	private mergeStringLists(primary: string[] = [], secondary: string[] = [], limit = 5): string[] {
		const seen = new Set<string>();
		const merged: string[] = [];
		for (const item of [...primary, ...secondary]) {
			const value = typeof item === 'string' ? item.trim() : '';
			if (!value || seen.has(value.toLowerCase())) {
				continue;
			}
			seen.add(value.toLowerCase());
			merged.push(value);
			if (merged.length >= limit) {
				break;
			}
		}
		return merged;
	}

	private mergeHealthDetails(
		primary?: AdvisoryResult['healthDetails'],
		secondary?: AdvisoryResult['healthDetails']
	): AdvisoryResult['healthDetails'] {
		if (!primary && !secondary) {
			return undefined;
		}

		return {
			symptoms: this.mergeStringLists(primary?.symptoms ?? [], secondary?.symptoms ?? [], 8),
			triagePriority: this.pickHigherTriage(primary?.triagePriority, secondary?.triagePriority),
			teacherChecklist: this.mergeStringLists(primary?.teacherChecklist ?? [], secondary?.teacherChecklist ?? [], 8),
			clinicActions: this.mergeStringLists(primary?.clinicActions ?? [], secondary?.clinicActions ?? [], 8),
			parentChecklist: this.mergeStringLists(primary?.parentChecklist ?? [], secondary?.parentChecklist ?? [], 8),
			recommendedFluidsAndVolumes: primary?.recommendedFluidsAndVolumes || secondary?.recommendedFluidsAndVolumes || '',
			coolingProcedures: this.mergeStringLists(primary?.coolingProcedures ?? [], secondary?.coolingProcedures ?? [], 8),
			whenToEscalate: primary?.whenToEscalate || secondary?.whenToEscalate || '',
			sampleAnnouncementText: primary?.sampleAnnouncementText || secondary?.sampleAnnouncementText || '',
		};
	}

	private pickHigherRiskLevel(
		left?: string,
		right?: string,
		weatherLevel?: string
	): AdvisoryResult['riskLevel'] {
		const order = ['safe', 'caution', 'extreme-caution', 'danger', 'extreme-danger'];
		const candidates = [left, right, weatherLevel].filter(Boolean) as string[];
		return candidates.reduce<AdvisoryResult['riskLevel']>((best, candidate) => {
			const bestIndex = order.indexOf(String(best));
			const candidateIndex = order.indexOf(candidate);
			return candidateIndex > bestIndex ? (candidate as AdvisoryResult['riskLevel']) : best;
		}, 'safe');
	}

	private pickHigherTriage(left?: string, right?: string): string | undefined {
		const rank: Record<string, number> = { urgent: 3, high: 2, monitor: 1, low: 0 };
		const l = (left ?? '').toLowerCase();
		const r = (right ?? '').toLowerCase();
		if (!l && !r) {
			return undefined;
		}
		return (rank[r] ?? -1) > (rank[l] ?? -1) ? right : left;
	}

	private async generatePythonAdvisory(
		input: AdvisoryInput,
		scopedQuery: string,
		languageStyle: LanguageStyle,
		variationSeed: number,
		skipAudit = false
	): Promise<AdvisoryResult | null> {
		const resolved = await this.resolvePythonModelPaths();
		if (!resolved) {
			console.warn('Python advisory model paths not found.');
			return null;
		}

		const pythonExecutable = await this.resolvePythonExecutable();
		const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'bth-ai-'));
		const inputPath = path.join(tmpDir, 'input.json');
		const pythonLanguage = languageStyle === 'taglish' ? 'tagalog' : languageStyle;

		try {
			const payload = {
				temperatureC: input.weather.temperatureC,
				humidityPercent: input.weather.humidityPercent,
				windSpeedMps: input.weather.windSpeedMps,
				pressureHpa: input.weather.pressureHpa,
				heatIndexC: input.weather.heatIndexC,
				source: input.weather.source,
			};

			await writeFile(inputPath, JSON.stringify(payload), 'utf-8');
			const { stdout } = await execFileAsync(
				pythonExecutable,
				[
					resolved.scriptPath,
					'predict',
					'--model-dir',
					resolved.modelDir,
					'--input-json',
					inputPath,
					'--language',
					pythonLanguage,
				],
				{ timeout: 45000 }
			);

			const parsed = this.parseAdvisory(String(stdout).trim(), input.weather, languageStyle);
			const result = this.enforceOutputScope(parsed, input.weather.heatLevel, languageStyle);
			const adjustedResult = this.applyQueryPolicy(result, input, scopedQuery, languageStyle);
			const variedResult = this.applyVariation(adjustedResult, variationSeed, languageStyle);

			// Apply server-side safety rules to ensure high heat-index forces higher risk levels.
			const finalResult = this.applySafetyRules(variedResult, input.weather);

			if (!skipAudit) {
				await this.logAdvisoryAudit(input, scopedQuery, finalResult, 'python', 'local-sklearn');
			}
			return this.maybeAttachSingle(finalResult, input);
		} catch (error) {
			console.error('Python advisory generation failed:', error);
			return null;
		} finally {
			await rm(tmpDir, { recursive: true, force: true });
		}
	}

	private async resolvePythonModelPaths(): Promise<{ scriptPath: string; modelDir: string } | null> {
		const scriptCandidates = [
			env.pythonScriptPath,
			path.resolve(process.cwd(), 'components', 'AIModel', 'python', 'ai.py'),
		];
		const modelCandidates = [
			env.pythonModelDir,
			path.resolve(process.cwd(), 'components', 'AIModel', 'python', 'model'),
		];

		const scriptPath = await this.pickExistingPath(scriptCandidates);
		const modelDir = await this.pickExistingPath(modelCandidates);

		if (!scriptPath || !modelDir) {
			return null;
		}

		return { scriptPath, modelDir };
	}

	private async resolvePythonExecutable(): Promise<string> {
		const candidates = [env.pythonExecutable, 'python'];
		for (const candidate of candidates) {
			if (await this.pathExists(candidate)) {
				return candidate;
			}
		}

		return 'python';
	}

	private async pickExistingPath(paths: string[]): Promise<string | null> {
		for (const candidate of paths) {
			if (await this.pathExists(candidate)) {
				return candidate;
			}
		}
		return null;
	}

	private async pathExists(candidate: string): Promise<boolean> {
		try {
			await access(candidate);
			return true;
		} catch {
			return false;
		}
	}

	private systemPrompt(knowledgeContext: string): string {
		const policyKnowledge = this.buildPolicyKnowledgeBlock();

		return [
			'You are a school heat safety advisory assistant for Beat The Heat.',
			'Prioritize the provided weather and heat-index data when giving heat safety guidance.',
			'Avoid medical diagnosis, legal advice, or unsafe instructions.',
			'If a question is not about heat safety, respond in a friendly, supportive tone and gently steer back to heat and school safety topics.',
			'Keep responses human, brief, and supportive. You may acknowledge feelings and ask a clarifying question before giving guidance.',
			'Return strict JSON object with keys: summary, riskLevel, actions, safetyTips, scopeNote, confidenceScore, decisionBasis, modelProfile, and healthDetails.',
			"decisionBasis must include: heatIndexC, temperatureC, humidityPercent, heatLevel, dataSource, rationale.",
			"modelProfile must include: mode and scope.",
			"healthDetails must be an object containing: symptoms (array of strings), triagePriority (one of 'urgent','high','monitor','low'), teacherChecklist (array of concise actions), clinicActions (array), parentChecklist (array), recommendedFluidsAndVolumes (string, e.g. 'water: 150-250ml every 15-20min'), coolingProcedures (array of steps), whenToEscalate (clear escalation criteria text), and sampleAnnouncementText (short announcement the school can send).",
			"All fields should be present where applicable; if a field is not applicable, return an empty array or an empty string rather than omitting keys.",
			'confidenceScore must be a number from 0.00 to 1.00.',
			'actions and safetyTips must be arrays of concise strings.',
			'Provide role-specific checklist items under `healthDetails.teacherChecklist`, `healthDetails.clinicActions`, and `healthDetails.parentChecklist` with short, actionable steps. Avoid vague recommendations. Use concrete cues (e.g., "If vomiting, move to clinic and give oral rehydration only if conscious").',
			'Vary phrasing and include at least one example of a brief announcement suitable for sending to parents under `healthDetails.sampleAnnouncementText`.',
			'You may expand each checklist into numbered steps, include sub-steps and short rationales. Aim to produce a comprehensive `healthDetails` section with rich, instructional content — the model may return long arrays and long strings. The system will accept large JSON outputs; the goal is up to ~1000 lines of advisory content when possible.',
			'When possible, include recommended fluid types and approximate volumes for children under `recommendedFluidsAndVolumes` (use ranges).',
			'Here are two strict JSON examples the model MUST follow (use these keys and types exactly):',
			`EXAMPLE_HIGH_HEAT: {"summary":"Current heat index is 48°C (danger). Reduce outdoor exposure immediately.","riskLevel":"danger","actions":["Suspend high-exertion outdoor activities","Provide shade and cooling breaks every 10-15 minutes"],"safetyTips":["Encourage sips of water every 10-15 minutes","Avoid sugary drinks"],"scopeNote":"System weather inputs only.","confidenceScore":0.92,"decisionBasis":{"heatIndexC":48,"temperatureC":34.2,"humidityPercent":71,"heatLevel":"danger","dataSource":"sensor","rationale":["Heat index exceeds danger threshold"]},"modelProfile":{"mode":"rule-grounded-ai","scope":"system-only"},"healthDetails":{"symptoms":["dizziness","nausea","excessive sweating"],"triagePriority":"urgent","teacherChecklist":["Move affected students to shaded area","Start cooling (remove excess clothing, fan)"],"clinicActions":["Assess airway/breathing","Initiate oral rehydration if conscious"],"parentChecklist":["Pick up child if symptoms persist","Keep child hydrated on way home"],"recommendedFluidsAndVolumes":"water: 150-250ml every 10-15min for ages 5-12","coolingProcedures":["Move to shade","Apply cool compress to neck/armpits"],"whenToEscalate":"If child shows confusion, fainting, or vomiting, escalate to clinic immediately","sampleAnnouncementText":"Due to high heat index, outdoor activities are limited today. Please ensure children bring water."}}`,
			`EXAMPLE_SAFE_HEAT: {"summary":"Current heat index is 26°C (safe). Normal activities may proceed with hydration reminders.","riskLevel":"safe","actions":["Encourage regular water breaks","Allow outdoor play with monitoring"],"safetyTips":["Bring water bottle","Wear light clothing"],"scopeNote":"System weather inputs only.","confidenceScore":0.8,"decisionBasis":{"heatIndexC":26,"temperatureC":25.3,"humidityPercent":73,"heatLevel":"safe","dataSource":"openweathermap","rationale":["Heat index in safe range"]},"modelProfile":{"mode":"rule-grounded-ai","scope":"system-only"},"healthDetails":{"symptoms":[],"triagePriority":"low","teacherChecklist":["Remind students to drink water every 20 minutes"],"clinicActions":[],"parentChecklist":["Provide water bottle"],"recommendedFluidsAndVolumes":"water: 50-100ml every 20min if active","coolingProcedures":[],"whenToEscalate":"If symptoms of heat stress appear, refer to clinic","sampleAnnouncementText":"Today's heat index is safe; remind students to bring water and stay shaded when possible."}}`,
			'If user asks about class suspension, answer directly with current heat-level implication and remind that final suspension decision is by school leadership and local DepEd authority.',
			'Always follow the language style of the user query: English to English, Tagalog to Tagalog, mixed Taglish to Taglish.',
			'Answer any question that is within heat safety, school advisories, weather impact, class activity safety, or parent/student precaution scope.',
			'If a variationHint is provided, use it to vary phrasing subtly without mentioning it.',
			`PROJECT POLICY KNOWLEDGE: ${policyKnowledge}`,
			knowledgeContext ? `KNOWLEDGE BASE: ${knowledgeContext}` : '',
			'Keep tone practical for school administrators, teachers, and parents.',
		].join(' ');
	}

	private getVariationSeed(): number {
		// Use a seconds-based seed so variation can change more frequently
		// (previously used minute-based seed which produced identical outputs
		// for repeated calls within the same minute).
		return Math.floor(Date.now() / 1000) % 60;
	}

	private buildVariationHint(seed: number, languageStyle: LanguageStyle): string {
		const styles = languageStyle === 'tagalog'
			? ['Maikli at diretso.', 'Praktikal at mahinahon.', 'May kaunting urgency pero calm.']
			: languageStyle === 'taglish'
				? ['Short and direct.', 'Practical and calm.', 'Slightly urgent but calm.']
				: ['Short and direct.', 'Practical and calm.', 'Slightly urgent but calm.'];

		return styles[Math.abs(seed) % styles.length];
	}

	private applyVariation(result: AdvisoryResult, seed: number, languageStyle: LanguageStyle): AdvisoryResult {
		const suffix = this.getVariationSuffix(seed, languageStyle);
		const summaryBase = suffix && !result.summary.includes(suffix) ? `${result.summary} ${suffix}`.trim() : result.summary;

		// Apply deterministic paraphrase/substitution to increase variation.
		const summary = this.varyText(seed, summaryBase, languageStyle);

		return {
			...result,
			summary,
			actions: this.rotateList(result.actions.map(a => this.varyText(seed, a, languageStyle)), seed),
			safetyTips: this.rotateList(result.safetyTips.map(t => this.varyText(seed, t, languageStyle)), seed),
		};
	}

	private varyText(seed: number, text: string, languageStyle: LanguageStyle): string {
		// Simple deterministic substitutions to paraphrase common phrases.
		const mapEng: Record<string, string[]> = {
			"Stand by for school updates.": [
				"Stand by for school updates.",
				"Please watch for school announcements.",
				"Wait for official school updates before changing schedules.",
			],
			"Increase water break frequency and check on at-risk students.": [
				"Increase water break frequency and check on at-risk students.",
				"Give more frequent water breaks and watch vulnerable students.",
				"Schedule extra hydration breaks and monitor at-risk pupils.",
			],
			"Avoid peak heat exposure.": [
				"Avoid peak heat exposure.",
				"Limit outdoor time during the hottest hours.",
				"Plan activities outside peak heat periods.",
			],
		};

		const mapTag: Record<string, string[]> = {
			"Stand by for school updates.": [
				"Mag-antabay sa abiso mula sa paaralan.",
				"Hintayin ang opisyal na update ng paaralan.",
				"Manatiling nakaantabay sa anunsiyo ng school.",
			],
		};

		const pool = languageStyle === 'tagalog' || languageStyle === 'taglish' ? mapTag : mapEng;
		for (const key of Object.keys(pool)) {
			if (text.includes(key)) {
				const variants = pool[key];
				const idx = Math.abs(seed + text.length) % variants.length;
				return text.replace(key, variants[idx]);
			}
		}

		return text;
	}

	private rotateList(list: string[], seed: number): string[] {
		if (list.length <= 1) {
			return list;
		}

		const offset = Math.abs(seed) % list.length;
		return [...list.slice(offset), ...list.slice(0, offset)];
	}

	private getVariationSuffix(seed: number, languageStyle: LanguageStyle): string {
		const suffixes = languageStyle === 'tagalog'
			? ['Bantayan ang hydration ngayon.', 'Mag-abang ng school updates.', 'Iwasan ang peak heat exposure.']
			: languageStyle === 'taglish'
				? ['Keep hydration in mind today.', 'Stand by for school updates.', 'Avoid peak heat exposure.']
				: ['Keep hydration in mind today.', 'Stand by for school updates.', 'Avoid peak heat exposure.'];

		return suffixes[Math.abs(seed) % suffixes.length];
	}

	private applySafetyRules(result: AdvisoryResult, weather: AdvisoryInput['weather']): AdvisoryResult {
		const hi = Number(weather?.heatIndexC ?? 0);
		let threshold: AdvisoryResult['riskLevel'] = 'safe';
		if (hi >= 50) {
			threshold = 'extreme-danger';
		} else if (hi >= 40) {
			threshold = 'danger';
		} else if (hi >= 37) {
			threshold = 'extreme-caution';
		} else if (hi >= 31) {
			threshold = 'caution';
		}

		const order = ['safe', 'caution', 'extreme-caution', 'danger', 'extreme-danger'];
		const currentIdx = order.indexOf(result.riskLevel || 'safe');
		const thIdx = order.indexOf(threshold);
		if (thIdx > currentIdx) {
			// Promote to threshold; annotate rationale and modelProfile
			const newResult = { ...result };
			newResult.riskLevel = threshold;
			newResult.decisionBasis = {
				...newResult.decisionBasis,
				rationale: newResult.decisionBasis?.rationale ? [...newResult.decisionBasis.rationale] : [],
			};
			const reason = `Rule override: heatIndexC=${hi} => ${threshold}`;
			if (Array.isArray(newResult.decisionBasis.rationale)) {
				newResult.decisionBasis.rationale.unshift(reason);
			} else {
				newResult.decisionBasis.rationale = [reason];
			}
			newResult.modelProfile = { ...newResult.modelProfile, ruleOverride: true } as any;
			return newResult;
		}

		return result;
	}

	private async buildKnowledgeContext(query: string): Promise<string> {
		const { handbook, docs } = await this.getKnowledgeCache();
		const relevant = this.extractRelevantNotes(query, docs);
		const blocks = [];
		if (handbook) {
			blocks.push(`Handbook: ${handbook}`);
		}
		if (relevant) {
			blocks.push(`Relevant notes: ${relevant}`);
		}
		return blocks.join(' ');
	}

	private async getKnowledgeCache(): Promise<{ handbook: string | null; docs: Map<string, string> }> {
		if (this.knowledgeCache) {
			return this.knowledgeCache;
		}

		const docs = new Map<string, string>();
		const handbookPath = path.resolve(process.cwd(), 'docs', 'text', 'AI_ASSISTANT_HANDBOOK.md');
		const handbook = await this.readTextFileSafe(handbookPath);
		const docPaths = [
			path.resolve(process.cwd(), 'docs', 'text', 'PROJECT_SCOPE.md'),
			path.resolve(process.cwd(), 'docs', 'text', 'PRINCIPAL_SPEC.md'),
			path.resolve(process.cwd(), 'docs', 'text', 'DEVELOPMENT_GUIDE.md'),
			path.resolve(process.cwd(), 'docs', 'text', 'CAPSTONE_DOCUMENTATION.md'),
		];

		for (const docPath of docPaths) {
			const content = await this.readTextFileSafe(docPath);
			if (content) {
				docs.set(path.basename(docPath), content);
			}
		}

		this.knowledgeCache = { handbook, docs };
		return this.knowledgeCache;
	}

	private async readTextFileSafe(filePath: string): Promise<string | null> {
		try {
			const content = await readFile(filePath, 'utf-8');
			const normalized = content.replace(/\r\n/g, '\n').trim();
			return normalized.slice(0, 6000);
		} catch {
			return null;
		}
	}

	private extractRelevantNotes(query: string, docs: Map<string, string>): string {
		const tokens = query
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((token) => token.length >= 3);

		if (tokens.length === 0 || docs.size === 0) {
			return '';
		}

		type ScoredSnippet = { source: string; text: string; score: number };
		const snippets: ScoredSnippet[] = [];

		for (const [source, content] of docs.entries()) {
			const paragraphs = content.split(/\n\s*\n/).map((paragraph) => paragraph.trim());
			for (const paragraph of paragraphs) {
				if (!paragraph) continue;
				const normalized = paragraph.toLowerCase();
				let score = 0;
				for (const token of tokens) {
					if (normalized.includes(token)) {
						score += 1;
					}
				}
				if (score > 0) {
					snippets.push({
						source,
						text: paragraph.replace(/\s+/g, ' ').slice(0, 280),
						score,
					});
				}
			}
		}

		const topSnippets = snippets
			.sort((a, b) => b.score - a.score)
			.slice(0, 3)
			.map((snippet) => `${snippet.source}: ${snippet.text}`)
			.join(' | ');

		return topSnippets;
	}

	private classifyScope(query: string): 'in-scope' | 'out-of-scope' {
		if (!query.trim()) {
			return 'in-scope';
		}

		const lowered = query.toLowerCase();
		if (['greeting', 'thanks', 'capability'].includes(this.detectConversationIntent(lowered))) {
			return 'in-scope';
		}

		const inScopeSignals = [
			'heat',
			'heat index',
			'temperature',
			'humidity',
			'weather',
			'forecast',
			'tomorrow',
			'next day',
			'next days',
			'advisory',
			'hydration',
			'dehydration',
			'dizzy',
			'heat stroke',
			'heat exhaustion',
			'outdoor',
			'recess',
			'pe',
			'class suspension',
			'may pasok',
			'school',
			'student',
			'parent',
			'init',
			'ulan',
			'panahon',
			'klase',
			'suspension',
			'warning signs',
			'nahihilo',
			'hilo',
			'tubig',
			'ano gagawin',
			'gagawin ko',
			'help',
			'tulong',
			'natatakot',
			'takot',
			'kabado',
			'panic',
			'hindi ko alam',
			'ano dapat',
		];

		if (inScopeSignals.some((token) => lowered.includes(token))) {
			return 'in-scope';
		}

		const outOfScopeSignals = [
			'politics',
			'election',
			'history',
			'math',
			'algebra',
			'programming',
			'javascript',
			'python',
			'movie',
			'celebrity',
			'gaming',
			'crypto',
			'bitcoin',
			'cryptocurrency',
			'stock market',
			'stocks',
			'finance',
			'nba',
			'finals',
			'love poem',
			'poem',
			'lyrics',
			'horoscope',
			'recipe',
			'how to',
			'tutorial',
		];

		if (outOfScopeSignals.some((token) => lowered.includes(token))) {
			return 'out-of-scope';
		}

		return 'in-scope';
	}

	private buildPolicyKnowledgeBlock(): string {
		const policy = projectPolicyFAQ.policy;
		const faq = projectPolicyFAQ.parentFAQ
			.map((item) => `Q: ${item.q} A: ${item.a}`)
			.join(' | ');

		return [
			`Allowed topics: ${projectPolicyFAQ.scope.allowedTopics.join(', ')}`,
			`Refusal rule: ${projectPolicyFAQ.scope.refusalRule}`,
			`Authority: ${policy.authority}`,
			`Heat thresholds C: safe ${policy.thresholdsC.safe}, caution ${policy.thresholdsC.caution}, extreme-caution ${policy.thresholdsC.extremeCaution}, danger ${policy.thresholdsC.danger}, extreme-danger ${policy.thresholdsC.extremeDanger}`,
			`Operational guidance: ${policy.operationalGuidance.join(' | ')}`,
			`Parent FAQ: ${faq}`,
		].join(' ');
	}

	private detectConversationIntent(query: string): ConversationIntent {
		const lowered = query.toLowerCase().trim();
		if (!lowered) {
			return 'general';
		}

		if (this.isSuspensionQuery(lowered)) {
			return 'suspension';
		}

		if (['hi', 'hello', 'hey', 'kumusta', 'kamusta', 'good morning', 'good afternoon', 'good evening'].some((token) => lowered === token || lowered.startsWith(`${token} `))) {
			return 'greeting';
		}

		if (/\b(thank you|thanks|salamat)\b/.test(lowered)) {
			return 'thanks';
		}

		if (['what can you do', 'kaya mo', 'ano kaya mo', 'anong pwede itanong', 'help me use'].some((token) => lowered.includes(token))) {
			return 'capability';
		}

		if (['forecast', 'predictions', 'prediction', 'next days', 'tomorrow', 'in the coming days', 'weather outlook', 'next week', 'this week', '1 week', 'one week', '7 days', 'seven days'].some((token) => lowered.includes(token))) {
			return 'forecast';
		}

		if (['nahihilo', 'dizzy', 'faint', 'nausea', 'hilo', 'headache', 'heat stroke', 'heat exhaustion', 'vomit', 'sumusuka'].some((token) => lowered.includes(token))) {
			return 'urgent-symptoms';
		}

		if (['bring', 'dalhin', 'baon', 'what to bring', 'ano dadalhin'].some((token) => lowered.includes(token))) {
			return 'what-to-bring';
		}

		if (['drink water', 'hydration', 'inom ng tubig', 'gano kadalas uminom'].some((token) => lowered.includes(token))) {
			return 'hydration';
		}

		if (['outdoor', 'pe', 'recess', 'safe outside', 'laro sa labas'].some((token) => lowered.includes(token))) {
			return 'outdoor-safety';
		}

		if (['school status', 'normal operations', 'open ba school', 'may pasok ba'].some((token) => lowered.includes(token))) {
			return 'school-status';
		}

		return 'general';
	}

	private buildScenarioTemplateAdvisory(
		intent: ConversationIntent,
		weather: AdvisoryInput['weather'],
		languageStyle: LanguageStyle
	): AdvisoryResult | null {
		if (intent === 'general' || intent === 'suspension') {
			return null;
		}

		const base = this.buildFallbackAdvisory(
			{ query: '', weather },
			'Provide current school heat safety advisory based on the given weather.',
			languageStyle
		);

		const template = this.getScenarioTemplate(intent, weather, languageStyle);

		return {
			...base,
			summary: template.summary,
			actions: template.actions,
			safetyTips: template.safetyTips,
			scopeNote: template.scopeNote,
			confidenceScore: 0.92,
			decisionBasis: {
				...base.decisionBasis,
				rationale: [
					...(base.decisionBasis.rationale ?? []),
					`Scenario template applied for intent: ${intent}`,
				].slice(0, 5),
			},
		};
	}

	private getScenarioTemplate(
		intent: Exclude<ConversationIntent, 'general' | 'suspension'>,
		weather: AdvisoryInput['weather'],
		languageStyle: LanguageStyle
	): { summary: string; actions: string[]; safetyTips: string[]; scopeNote: string } {
		const hi = weather.heatIndexC;
		const level = weather.heatLevel;

		if (languageStyle === 'tagalog') {
			if (intent === 'greeting') {
				return {
					summary: `Hello parent. Kasalukuyang heat index ay ${hi}°C (${level}). Handa akong tumulong sa heat safety questions para sa inyong anak.`,
					actions: ['Maaari kang magtanong tungkol sa outdoor safety, hydration, at warning signs.', 'Maaari rin tungkol sa class suspension guidance base sa heat level.'],
					safetyTips: ['Panatilihing hydrated ang bata.', 'I-monitor ang updates ng school para sa schedule changes.'],
					scopeNote: 'Nasa heat safety advisory scope lang ang assistant na ito.',
				};
			}

			if (intent === 'thanks') {
				return {
					summary: 'Walang anuman. Nandito ako para tumulong sa heat safety decisions ng family ninyo.',
					actions: ['Itanong ang kasalukuyang risk level para sa activity planning.', 'Itanong din kung ano ang dapat dalhin ng bata kapag mainit.'],
					safetyTips: ['Maghanda ng tubig at pamunas.', 'Iwasan ang matinding outdoor activity sa peak heat hours.'],
					scopeNote: 'Heat-advisory scope lang ang sinasagot ko para consistent at safe.',
				};
			}

			if (intent === 'capability') {
				return {
					summary: 'Kaya kong sagutin ang heat index advisory concerns ng parents at school safety guidance. AI performance rating: 80%.',
					actions: ['Magtanong tungkol sa hydration frequency, outdoor activity safety, at warning signs.', 'Magtanong tungkol sa class suspension guidance base sa heat level.'],
					safetyTips: ['Gamitin ang kasalukuyang heat index para mas precise na sagot.', 'Sundin pa rin ang official school at DepEd announcements.'],
					scopeNote: 'Hindi ako open-topic chatbot; project scope lang ang sakop.',
				};
			}

			if (intent === 'urgent-symptoms') {
				return {
					summary: 'Kung may sintomas ng heat stress (hilo, pagsusuka, matinding sakit ng ulo), ituring ito bilang urgent at i-refer agad sa school clinic o pinakamalapit na health provider.',
					actions: ['Ipatigil muna ang outdoor activity at ilipat sa malamig na lugar.', 'Bigyan ng tubig kung conscious at kaya uminom.', 'I-notify agad ang class adviser at school clinic.'],
					safetyTips: ['Huwag ipilit ang bata sa init habang may sintomas.', 'Mag-seek ng medical assessment kapag tuloy-tuloy ang sintomas.'],
					scopeNote: 'Ito ay school heat-safety guidance at hindi kapalit ng propesyonal na medical diagnosis.',
				};
			}
		}

		if (intent === 'greeting') {
			return {
				summary:
					languageStyle === 'taglish'
						? `Hi parent. Current heat index is ${hi}°C (${level}). Ready akong tumulong sa heat-safety questions para sa child mo.`
						: `Hi parent. Current heat index is ${hi}°C (${level}). I can help with practical heat-safety guidance for your child.`,
				actions:
					languageStyle === 'taglish'
						? ['Ask about outdoor safety, hydration, warning signs, or class suspension guidance.', 'Pwede ka rin magtanong about what to bring during hot days.']
						: ['Ask about outdoor safety, hydration, warning signs, or class suspension guidance.', 'You can also ask what your child should bring during hot days.'],
				safetyTips:
					languageStyle === 'taglish'
						? ['Keep your child hydrated throughout the day.', 'Monitor school announcements for schedule updates.']
						: ['Keep your child hydrated throughout the day.', 'Monitor school announcements for schedule updates.'],
				scopeNote:
					languageStyle === 'taglish'
						? 'Heat-advisory scope lang ang assistant na ito.'
						: 'This assistant stays within heat-safety advisory scope only.',
			};
		}

		if (intent === 'thanks') {
			return {
				summary:
					languageStyle === 'taglish'
						? 'You are welcome. Nandito ako to support your heat-safety decisions as a parent.'
						: 'You are welcome. I am here to support your heat-safety decisions as a parent.',
				actions:
					languageStyle === 'taglish'
						? ['You can ask current risk level before outdoor activities.', 'Pwede mo rin itanong if safe ang PE or recess today.']
						: ['You can ask current risk level before outdoor activities.', 'You can also ask if PE or recess is safe today.'],
				safetyTips:
					languageStyle === 'taglish'
						? ['Prepare water bottle and light clothing for your child.', 'Avoid heavy outdoor exposure during peak heat hours.']
						: ['Prepare water bottle and light clothing for your child.', 'Avoid heavy outdoor exposure during peak heat hours.'],
				scopeNote:
					languageStyle === 'taglish'
						? 'Project heat-advisory scope only para consistent and safe ang guidance.'
						: 'Project heat-advisory scope only for consistent and safe guidance.',
			};
		}

		if (intent === 'capability') {
			return {
				summary:
					languageStyle === 'taglish'
						? 'I can answer parent questions about heat index, weather impact, student precautions, and school safety advisories. AI performance rating: 80%.'
						: 'I can answer parent questions about heat index, weather impact, student precautions, and school safety advisories. AI performance rating: 80%.',
				actions:
					languageStyle === 'taglish'
						? ['Ask about hydration frequency, outdoor safety, warning signs, and class suspension guidance.', 'Use English, Tagalog, or Taglish and I will adapt.']
						: ['Ask about hydration frequency, outdoor safety, warning signs, and class suspension guidance.', 'Use English, Tagalog, or Taglish and I will adapt.'],
				safetyTips:
					languageStyle === 'taglish'
						? ['Use current heat condition for more precise response.', 'Follow official school and DepEd announcements for final decisions.']
						: ['Use current heat condition for more precise response.', 'Follow official school and DepEd announcements for final decisions.'],
				scopeNote:
					languageStyle === 'taglish'
						? 'Hindi ako open-topic chatbot; project scope lang ang sagot ko.'
						: 'I am not an open-topic chatbot; I stay within project scope.',
			};
		}

		if (intent === 'urgent-symptoms') {
			return {
				summary:
					languageStyle === 'taglish'
						? 'If your child has dizziness, vomiting, severe headache, or confusion, treat this as urgent and refer to school clinic or nearest health provider immediately.'
						: 'If your child has dizziness, vomiting, severe headache, or confusion, treat this as urgent and refer to school clinic or nearest health provider immediately.',
				actions:
					languageStyle === 'taglish'
						? ['Stop outdoor activity and move the child to a cool shaded area.', 'Provide water if the child is conscious and can drink.', 'Notify class adviser and school clinic immediately.']
						: ['Stop outdoor activity and move the child to a cool shaded area.', 'Provide water if the child is conscious and can drink.', 'Notify class adviser and school clinic immediately.'],
				safetyTips:
					languageStyle === 'taglish'
						? ['Do not force the child to continue activity while symptomatic.', 'Seek medical assessment if symptoms persist or worsen.']
						: ['Do not force the child to continue activity while symptomatic.', 'Seek medical assessment if symptoms persist or worsen.'],
				scopeNote:
					languageStyle === 'taglish'
						? 'Heat-safety guidance ito at hindi kapalit ng professional medical diagnosis.'
						: 'This is heat-safety guidance and not a replacement for professional medical diagnosis.',
			};
		}

		if (intent === 'what-to-bring') {
			return {
				summary: `Current heat index is ${hi}°C (${level}). Recommended na ihanda ang bata para sa init ngayong araw.`,
				actions: ['Bring water bottle na madaling i-refill.', 'Use light breathable uniform plus hand towel.', 'Prepare cap/umbrella for sun exposure.'],
				safetyTips: ['Remind the child to drink water regularly.', 'Coordinate with teacher if child has heat sensitivity.'],
				scopeNote: 'Guidance is based on current heat and school-safety scope only.',
			};
		}

		if (intent === 'hydration') {
			return {
				summary: `Hydration is important today at ${hi}°C (${level}).`,
				actions: ['Encourage drinking water every 15 to 20 minutes during hot periods.', 'Refill water bottle before outdoor or PE activities.', 'Remind child to hydrate even without feeling thirsty.'],
				safetyTips: ['Avoid sugary or dehydrating drinks during hot hours.', 'Pair hydration with short rest breaks in shaded/cool areas.'],
				scopeNote: 'Hydration guidance is aligned to school heat advisory scope.',
			};
		}

		if (intent === 'outdoor-safety') {
			return {
				summary: `Outdoor safety depends on current heat level (${level}) at ${hi}°C heat index.`,
				actions: ['Reduce high-exertion activity during peak heat periods.', 'Use shaded or indoor alternatives when possible.', 'Coordinate with teachers for modified activity plans.'],
				safetyTips: ['Watch for dizziness, fatigue, or headache signs.', 'Pause activity immediately if symptoms appear.'],
				scopeNote: 'This is safety guidance, while final activity decisions are made by school authorities.',
			};
		}

		if (intent === 'school-status') {
			return {
				summary: `Based on current heat level (${level}), continue monitoring school announcements for any schedule updates.`,
				actions: ['Check school channels for official advisories.', 'Prepare child for heat-safe routine while classes are active.', 'Re-check heat status later if temperature rises.'],
				safetyTips: ['Final class suspension or schedule changes are issued by school and DepEd leadership.', 'Keep communication lines open with advisers.'],
				scopeNote: 'Assistant provides heat-based guidance only, not official schedule orders.',
			};
		}

		return {
			summary: `I can assist with heat safety guidance based on current conditions (${hi}°C, ${level}).`,
			actions: ['Ask about hydration, outdoor activity, warning signs, or class safety guidance.', 'Use specific parent concerns for more tailored advisory output.'],
			safetyTips: ['Stay within official school and DepEd advisories for final decisions.', 'Use latest heat updates for best recommendations.'],
			scopeNote: 'Project scope only: heat, weather, school advisories, and parent/student precautions.',
		};
	}

	private buildForecastAdvisory(
		forecastDays: WeatherForecastDay[],
		languageStyle: LanguageStyle,
		mode: string
	): AdvisoryResult {
		if (forecastDays.length === 0) {
			return this.buildFallbackAdvisory(
				{ query: '', weather: { source: 'fallback', location: '', temperatureC: 0, humidityPercent: 0, condition: '', windSpeedMps: 0, pressureHpa: 0, heatIndexC: 0, heatLevel: 'safe', timestamp: new Date().toISOString() } },
				'Provide current school heat safety advisory based on the given weather.',
				languageStyle
			);
		}

		const worstDay = [...forecastDays].sort((left, right) => right.heatIndexC - left.heatIndexC)[0];
		const hotDays = forecastDays.filter((day) => day.heatLevel === 'danger' || day.heatLevel === 'extreme-danger').length;
		const dangerDays = forecastDays.filter((day) => day.heatLevel === 'danger').length;
		const extremeDays = forecastDays.filter((day) => day.heatLevel === 'extreme-danger').length;
		const daySummaries = forecastDays.slice(0, 7).map((day, index) => `${index + 1}. ${day.date}: ${day.heatIndexC}°C (${day.heatLevel})`).join(' | ');

		if (languageStyle === 'tagalog') {
			return {
				summary: `Narito ang 7-day heat outlook mula sa real OpenWeather forecast data. Pinakamainit na araw ay ${worstDay.date} na may ${worstDay.heatIndexC}°C (${worstDay.heatLevel}).`,
				riskLevel: worstDay.heatLevel,
				actions: [
					'Planuhin ang indoor activities sa mga araw na mataas ang heat level.',
					'Panatilihin ang regular hydration at cooling breaks araw-araw.',
					'Kung may danger days, bawasan ang outdoor PE at assemblies lalo na sa tanghali.',
				],
				safetyTips: [
					`Forecast summary: ${daySummaries}`,
					`Danger days: ${dangerDays}; extreme-danger days: ${extremeDays}; total hot days: ${hotDays}.`,
					`Real forecast mode: ${mode}.`,
				],
				scopeNote: 'Real OpenWeather forecast data ang base ng 7-day outlook.',
				confidenceScore: 0.93,
				decisionBasis: {
					heatIndexC: worstDay.heatIndexC,
					temperatureC: worstDay.temperatureC,
					humidityPercent: worstDay.humidityPercent,
					heatLevel: worstDay.heatLevel,
					dataSource: `openweathermap:${mode}`,
					rationale: [
						'Forecast values are taken from OpenWeather real forecast data.',
						`Highest projected heat index is ${worstDay.heatIndexC}°C on ${worstDay.date}.`,
					],
				},
				modelProfile: {
					mode: 'rule-grounded-ai',
					scope: 'system-only',
				},
				healthDetails: {
					symptoms: [],
					triagePriority: worstDay.heatLevel === 'extreme-danger' ? 'urgent' : worstDay.heatLevel === 'danger' ? 'high' : 'monitor',
					teacherChecklist: [
						'Iconfirm ang forecast bawat araw bago ang PE at outdoor events.',
						'Gumawa ng indoor fallback plan para sa mga hot days.',
					],
					clinicActions: ['Prepare cooling area and hydration supplies for danger days.'],
					parentChecklist: ['Check daily forecast bago pumasok ang bata.', 'Magbaon ng tubig at light clothing araw-araw.'],
					recommendedFluidsAndVolumes: 'water: 150-250ml every 15-20min during hot days',
					coolingProcedures: ['Use shaded or air-conditioned spaces during peak heat.'],
					whenToEscalate: 'If forecasted danger days coincide with symptoms, refer to clinic immediately.',
					sampleAnnouncementText: 'Real forecast shows hot days ahead. Please ensure students bring water and avoid unnecessary sun exposure.',
				},
			};
		}

		if (languageStyle === 'taglish') {
			return {
				summary: `Narito ang 7-day heat outlook from real OpenWeather forecast data. Pinakamainit na day ay ${worstDay.date} with ${worstDay.heatIndexC}°C (${worstDay.heatLevel}).`,
				riskLevel: worstDay.heatLevel,
				actions: [
					'Plan indoor activities sa mga araw na mataas ang heat level.',
					'Keep hydration at cooling breaks daily.',
					'If may danger days, bawasan ang outdoor PE at assemblies lalo na tanghali.',
				],
				safetyTips: [
					`Forecast summary: ${daySummaries}`,
					`Danger days: ${dangerDays}; extreme-danger days: ${extremeDays}; total hot days: ${hotDays}.`,
					`Real forecast mode: ${mode}.`,
				],
				scopeNote: 'Real OpenWeather forecast data ang base ng 7-day outlook.',
				confidenceScore: 0.93,
				decisionBasis: {
					heatIndexC: worstDay.heatIndexC,
					temperatureC: worstDay.temperatureC,
					humidityPercent: worstDay.humidityPercent,
					heatLevel: worstDay.heatLevel,
					dataSource: `openweathermap:${mode}`,
					rationale: [
						'Forecast values are taken from OpenWeather real forecast data.',
						`Highest projected heat index is ${worstDay.heatIndexC}°C on ${worstDay.date}.`,
					],
				},
				modelProfile: {
					mode: 'rule-grounded-ai',
					scope: 'system-only',
				},
				healthDetails: {
					symptoms: [],
					triagePriority: worstDay.heatLevel === 'extreme-danger' ? 'urgent' : worstDay.heatLevel === 'danger' ? 'high' : 'monitor',
					teacherChecklist: ['Check forecast daily before PE and outdoor events.', 'Prepare indoor fallback plans for hot days.'],
					clinicActions: ['Prepare cooling area and hydration supplies for danger days.'],
					parentChecklist: ['Check daily forecast before sending the child to school.', 'Pack water and light clothing every day.'],
					recommendedFluidsAndVolumes: 'water: 150-250ml every 15-20min during hot days',
					coolingProcedures: ['Use shaded or air-conditioned spaces during peak heat.'],
					whenToEscalate: 'If forecasted danger days coincide with symptoms, refer to clinic immediately.',
					sampleAnnouncementText: 'Real forecast shows hot days ahead. Please ensure students bring water and avoid unnecessary sun exposure.',
				},
			};
		}

		return {
			summary: `Here is the 7-day heat outlook from real OpenWeather forecast data. The hottest day is ${worstDay.date} with ${worstDay.heatIndexC}°C (${worstDay.heatLevel}).`,
			riskLevel: worstDay.heatLevel,
			actions: [
				'Plan indoor activities on the hottest days.',
				'Keep daily hydration and cooling breaks in place.',
				'Reduce outdoor PE and assemblies during peak heat if danger days appear.',
			],
			safetyTips: [
				`Forecast summary: ${daySummaries}`,
				`Danger days: ${dangerDays}; extreme-danger days: ${extremeDays}; total hot days: ${hotDays}.`,
				`Real forecast mode: ${mode}.`,
			],
			scopeNote: 'Real OpenWeather forecast data powers this 7-day outlook.',
			confidenceScore: 0.93,
			decisionBasis: {
				heatIndexC: worstDay.heatIndexC,
				temperatureC: worstDay.temperatureC,
				humidityPercent: worstDay.humidityPercent,
				heatLevel: worstDay.heatLevel,
				dataSource: `openweathermap:${mode}`,
				rationale: [
					'Forecast values are taken from OpenWeather real forecast data.',
					`Highest projected heat index is ${worstDay.heatIndexC}°C on ${worstDay.date}.`,
				],
			},
			modelProfile: {
				mode: 'rule-grounded-ai',
				scope: 'system-only',
			},
			healthDetails: {
				symptoms: [],
				triagePriority: worstDay.heatLevel === 'extreme-danger' ? 'urgent' : worstDay.heatLevel === 'danger' ? 'high' : 'monitor',
				teacherChecklist: ['Check forecast daily before PE and outdoor events.', 'Prepare indoor fallback plans for hot days.'],
				clinicActions: ['Prepare cooling area and hydration supplies for danger days.'],
				parentChecklist: ['Check daily forecast before sending the child to school.', 'Pack water and light clothing every day.'],
				recommendedFluidsAndVolumes: 'water: 150-250ml every 15-20min during hot days',
				coolingProcedures: ['Use shaded or air-conditioned spaces during peak heat.'],
				whenToEscalate: 'If forecasted danger days coincide with symptoms, refer to clinic immediately.',
				sampleAnnouncementText: 'Real forecast shows hot days ahead. Please ensure students bring water and avoid unnecessary sun exposure.',
			},
		};
	}

	private buildScopeRefusalAdvisory(
		weather: AdvisoryInput['weather'],
		languageStyle: LanguageStyle
	): AdvisoryResult {
		const base = this.buildFallbackAdvisory(
			{ query: '', weather },
			'Provide current school heat safety advisory based on the given weather.',
			languageStyle
		);

		const localized = this.getScopeRefusalTemplate(languageStyle);

		return {
			...base,
			summary: localized.summary,
			actions: localized.actions,
			safetyTips: localized.safetyTips,
			scopeNote: localized.scopeNote,
			confidenceScore: 0.9,
			decisionBasis: {
				...base.decisionBasis,
				rationale: [
					...(base.decisionBasis.rationale ?? []),
					'Strict scope refusal template was applied to keep the assistant project-focused.',
				].slice(0, 5),
			},
		};
	}

	private getScopeRefusalTemplate(languageStyle: LanguageStyle): {
		summary: string;
		actions: string[];
		safetyTips: string[];
		scopeNote: string;
	} {
		if (languageStyle === 'tagalog') {
			return {
				summary: 'Naiintindihan ko. Para makatulong, pwede mo bang i-share kung tungkol ito sa init sa school o safety ng bata?',
				actions: [
					'Pwede kang magtanong tungkol sa kasalukuyang heat index at anong dapat gawin ng school at parents.',
					'Kung may nararamdaman ang bata (hilo, pagsusuka), sabihin mo para makapagbigay ako ng guidance.',
				],
				safetyTips: [
					'Itanong ang current heat condition para sa mas eksaktong advisory.',
					'Sundin ang official school at DepEd announcements para sa class schedule decisions.',
				],
				scopeNote: 'Scope: heat, weather, advisories, at parent/student precautions lamang.',
			};
		}

		if (languageStyle === 'taglish') {
			return {
				summary: 'Gets. Para makatulong, can you share if this is about heat or school safety?',
				actions: [
					'Ask about current heat level and recommended school safety actions.',
					'You can also ask parent precautions during hot weather (hydration, outdoor limits, warning signs).',
				],
				safetyTips: [
					'Ask for current heat condition para mas accurate ang advisory.',
					'Follow official school and DepEd announcements for schedule decisions.',
				],
				scopeNote: 'Scope: heat, weather, advisories, and parent/student precautions only.',
			};
		}

		return {
			summary: 'I hear you. Can you tell me if this is about heat, weather, or school safety so I can help?',
			actions: [
				'Ask about current heat level and recommended safety actions for students and parents.',
				'Ask about class activity adjustments, hydration, and warning signs of heat stress.',
			],
			safetyTips: [
				'Use current heat conditions to get a focused advisory response.',
				'Follow official school and DepEd communication channels for class schedule decisions.',
			],
			scopeNote: 'Scope: heat, weather, advisories, and parent/student precautions only.',
		};
	}

	private applyQueryPolicy(
		result: AdvisoryResult,
		input: AdvisoryInput,
		scopedQuery: string,
		languageStyle: LanguageStyle
	): AdvisoryResult {
		if (!this.isSuspensionQuery(scopedQuery)) {
			return result;
		}

		const level = input.weather.heatLevel;
		const suspensionLine = this.getSuspensionGuidance(level, languageStyle);
		const authorityNote = this.getAuthorityNote(languageStyle);
		const watchAnnouncementTip = this.getAnnouncementTip(languageStyle);

		return {
			...result,
			summary: `${result.summary} ${suspensionLine}`,
			actions: [
				`${this.getSuspensionActionPrefix(languageStyle)}: ${suspensionLine}`,
				...result.actions,
				authorityNote,
			].slice(0, 4),
			safetyTips: [
				...result.safetyTips,
				watchAnnouncementTip,
			].slice(0, 4),
			scopeNote: this.getSuspensionScopeNote(languageStyle),
			decisionBasis: {
				...result.decisionBasis,
				rationale: [
					...(result.decisionBasis.rationale ?? []),
					this.getSuspensionRationale(languageStyle),
				].slice(0, 5),
			},
		};
	}

	private isSuspensionQuery(query: string): boolean {
		const q = query.toLowerCase();
		return [
			'class suspension',
			'suspend class',
			'suspend classes',
			'suspended',
			'suspension',
			'suspend',
			'cancel class',
			'cancel classes',
			'walang pasok',
			'magsuspend',
			'isuspend',
			'suspinde',
			'kansela klase',
		].some((token) => q.includes(token));
	}

	private getLocalizedSummary(heatIndexC: number, level: string, languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			return `Kasalukuyang heat index ay ${heatIndexC}°C (${level}). Unahin ang pag-inom ng tubig, lilim, at bawas na outdoor exposure.`;
		}

		if (languageStyle === 'taglish') {
			return `Current heat index is ${heatIndexC}°C (${level}). Unahin ang hydration, lilim, at bawas outdoor exposure.`;
		}

		return `Current heat index is ${heatIndexC}°C (${level}). Prioritize hydration, shade, and reduced outdoor exposure.`;
	}

	private getLocalizedRationale(languageStyle: LanguageStyle): string[] {
		if (languageStyle === 'tagalog') {
			return [
				'Ang heat index at humidity ay nagpapakita ng mas mataas na panganib ng heat stress.',
				'Ang recommendations ay nakatuon lang sa school operations at student safety.',
			];
		}

		if (languageStyle === 'taglish') {
			return [
				'Heat index at humidity indicate elevated heat stress risk.',
				'Ang recommendations ay limited sa school operations at student safety.',
			];
		}

		return [
			'Heat index and humidity indicate elevated heat stress potential.',
			'Recommendations are constrained to school operations and student safety.',
		];
	}

	private getLocalizedScopeRedirect(
		heatLevel: string,
		languageStyle: LanguageStyle
	): { summary: string; actions: string[]; safetyTips: string[]; scopeNote: string } {
		if (languageStyle === 'tagalog') {
			return {
				summary: `Limitado ang advisory sa weather at heat-index data ng system. Kasalukuyang heat level: ${heatLevel}.`,
				actions: [
					'Suriin ang kasalukuyang heat index at ipagpaliban ang mabibigat na outdoor activity kung kailangan.',
					'Siguraduhin ang access sa inuming tubig sa classrooms at activity areas.',
					'Mag-monitor ng maagang sintomas ng heat stress at i-escalate agad sa clinic kung kailangan.',
				],
				safetyTips: [
					'Hikayatin ang regular na pag-inom ng tubig kada 15 hanggang 20 minuto kapag mainit.',
					'Gumamit ng shaded o indoor alternatives para sa PE at assemblies kapag mataas ang risk.',
					'Makipag-coordinate sa class advisers para sa at-risk students at mabilis na cooling response.',
				],
				scopeNote: 'System-provided weather, humidity, at heat-index inputs lang ang ginagamit.',
			};
		}

		if (languageStyle === 'taglish') {
			return {
				summary: `Advisory scope ay limited sa weather at heat-index data ng system. Current heat level: ${heatLevel}.`,
				actions: [
					'Review current heat index at i-postpone ang high-exertion outdoor activity kung kailangan.',
					'Ensure may access sa drinking water sa classrooms at activity areas.',
					'Monitor students for early heat stress signs at i-escalate sa clinic when needed.',
				],
				safetyTips: [
					'Encourage frequent hydration every 15 to 20 minutes kapag mainit.',
					'Use shaded or indoor alternatives for PE at assemblies kapag elevated ang risk.',
					'Coordinate with class advisers para sa at-risk students at immediate cooling response.',
				],
				scopeNote: 'Only system-provided weather, humidity, at heat-index inputs are used.',
			};
		}

		return {
			summary: `Advisory scope is limited to this system's weather and heat-index data. Current heat level: ${heatLevel}.`,
			actions: [
				'Review current heat index and postpone high-exertion outdoor activity if needed.',
				'Ensure drinking water access in classrooms and activity areas.',
				'Monitor students for early heat stress signs and escalate to clinic when needed.',
			],
			safetyTips: [
				'Encourage frequent hydration every 15 to 20 minutes during hot periods.',
				'Use shaded or indoor alternatives for PE and assemblies when risk is elevated.',
				'Coordinate with class advisers for at-risk students and immediate cooling response.',
			],
			scopeNote: 'Only system-provided weather, humidity, and heat-index inputs are used.',
		};
	}

	private getSuspensionGuidance(heatLevel: string, languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			if (heatLevel === 'extreme-danger') {
				return 'Extreme danger level: inirerekomenda ang agarang paghinto ng outdoor activities at puwedeng ikonsidera ang full class suspension base sa official school at DepEd decision.';
			}

			if (heatLevel === 'danger') {
				return 'Danger level: inirerekomenda ang pagsuspinde ng matinding outdoor classes ngayon at maghanda sa partial o full class suspension kapag nagpatuloy ang init.';
			}

			if (heatLevel === 'extreme-caution') {
				return 'Extreme caution level: hindi pa automatic ang class suspension, pero limitahan ang outdoor activity at mag-monitor kung tataas pa sa danger.';
			}

			if (heatLevel === 'caution') {
				return 'Caution level: karaniwang hindi pa nirerekomenda ang class suspension; ituloy ang klase with hydration at reduced outdoor exposure.';
			}

			return 'Safe level: hindi nirerekomenda ang class suspension sa ngayon base sa kasalukuyang heat condition.';
		}

		if (languageStyle === 'taglish') {
			if (heatLevel === 'extreme-danger') {
				return 'Extreme danger level: recommend immediate stop ng outdoor activities at puwedeng i-consider ang full class suspension based on official school at DepEd decision.';
			}

			if (heatLevel === 'danger') {
				return 'Danger level: recommend suspending strenuous outdoor classes now at mag-prepare sa partial or full class suspension if heat persists.';
			}

			if (heatLevel === 'extreme-caution') {
				return 'Extreme caution level: hindi pa automatic ang class suspension, pero restrict outdoor activity at monitor escalation to danger levels.';
			}

			if (heatLevel === 'caution') {
				return 'Caution level: class suspension is not typically recommended; continue classes with hydration at reduced outdoor exposure.';
			}

			return 'Safe level: class suspension is not recommended ngayon based on current heat conditions.';
		}

		if (heatLevel === 'extreme-danger') {
			return 'Extreme danger level: recommend immediate suspension of outdoor activities and consider full class suspension based on official school/DepEd decision.';
		}

		if (heatLevel === 'danger') {
			return 'Danger level: recommend suspending strenuous outdoor classes now and prepare for partial or full class suspension if heat persists.';
		}

		if (heatLevel === 'extreme-caution') {
			return 'Extreme caution level: no automatic class suspension yet, but restrict outdoor activity and monitor for escalation to danger levels.';
		}

		if (heatLevel === 'caution') {
			return 'Caution level: class suspension is not typically recommended; continue classes with hydration and reduced outdoor exposure.';
		}

		return 'Safe level: class suspension is not recommended at this time based on current heat conditions.';
	}

	private getAuthorityNote(languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			return 'I-coordinate ang final class suspension decision sa school head at local DepEd office.';
		}

		if (languageStyle === 'taglish') {
			return 'I-coordinate ang final class suspension decision with school head at local DepEd office.';
		}

		return 'Coordinate final class suspension decision with school head and local DepEd office.';
	}

	private getSuspensionActionPrefix(languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			return 'Gabay sa class suspension';
		}

		if (languageStyle === 'taglish') {
			return 'Class suspension gabay';
		}

		return 'Class suspension guidance';
	}

	private getAnnouncementTip(languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			return 'Mag-abang ng opisyal na announcement mula sa school communication channels.';
		}

		if (languageStyle === 'taglish') {
			return 'Mag-stand by sa official announcements through school communication channels.';
		}

		return 'Stand by for official announcements through school communication channels.';
	}

	private getSuspensionScopeNote(languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			return 'Ang class suspension guidance ay naka-base sa heat level ng system; ang final authority sa suspension ay nasa school at DepEd leadership pa rin.';
		}

		if (languageStyle === 'taglish') {
			return 'Class suspension guidance ay heat-level based from this system; final suspension authority remains with school at DepEd leadership.';
		}

		return 'Class suspension guidance is heat-level based from this system; final suspension authority remains with school and DepEd leadership.';
	}

	private getSuspensionRationale(languageStyle: LanguageStyle): string {
		if (languageStyle === 'tagalog') {
			return 'Na-activate ang suspension response path dahil tungkol sa class suspension ang query.';
		}

		if (languageStyle === 'taglish') {
			return 'Na-activate ang suspension response path because the query is about class suspension.';
		}

		return 'Suspension response path was activated because query is about class suspension.';
	}

	private scopeUserQuery(query: string): string {
		return query.trim() || 'Provide current school heat safety advisory based on the given weather.';
	}

	private detectLanguageStyle(query: string): LanguageStyle {
		const lowered = query.toLowerCase();
		const tagalogHints = [
			'may',
			'yung',
			'nga',
			'pa',
			'lang',
			'po',
			'opo',
			'ba',
			'kasi',
			'naman',
			'pwede',
			'dapat',
			'walang pasok',
			'tumaas',
			'init',
			'ulan',
			'kailan',
			'paano',
			'bakit',
		];
		const englishHints = [
			'what',
			'when',
			'why',
			'how',
			'should',
			'can',
			'class',
			'suspension',
			'safe',
			'weather',
			'heat index',
			'student',
		];

		const tagalogScore = tagalogHints.reduce((score, token) => (lowered.includes(token) ? score + 1 : score), 0);
		const englishScore = englishHints.reduce((score, token) => (lowered.includes(token) ? score + 1 : score), 0);
		const hasEnglishConnector = /\b(if|should|can|what|when|how|will)\b/.test(lowered);

		if (tagalogScore > 0 && englishScore > 0) {
			if (hasEnglishConnector) {
				return 'taglish';
			}

			if (tagalogScore >= englishScore + 2) {
				return 'tagalog';
			}

			if (englishScore >= tagalogScore + 2) {
				return 'english';
			}

			return 'taglish';
		}

		if (tagalogScore > 0) {
			return 'tagalog';
		}

		return 'english';
	}

	private parseAdvisory(
		content: string | undefined,
		weather: AdvisoryInput['weather'],
		languageStyle: LanguageStyle
	): AdvisoryResult {
		if (!content) {
			return this.buildNormalizedAdvisoryFromText('', weather, languageStyle);
		}

		const parsed = this.tryParseAdvisoryPayload(content);
		if (parsed) {
			const symptoms = parsed.healthDetails?.symptoms ?? parsed.symptoms;
			const teacherChecklist = parsed.healthDetails?.teacherChecklist ?? parsed.teacherChecklist;
			const clinicActions = parsed.healthDetails?.clinicActions ?? parsed.clinicActions;
			const parentChecklist = parsed.healthDetails?.parentChecklist ?? parsed.parentChecklist;
			const coolingProcedures = parsed.healthDetails?.coolingProcedures ?? parsed.coolingProcedures;

			const mapped: AdvisoryResult = {
				summary: parsed.summary ?? 'No summary provided.',
				riskLevel: parsed.riskLevel ?? 'unknown',
				actions: Array.isArray(parsed.actions) ? parsed.actions.map(String) : [],
				safetyTips: Array.isArray(parsed.safetyTips) ? parsed.safetyTips.map(String) : [],
				scopeNote:
					parsed.scopeNote ??
					'This response is restricted to system weather and heat-index inputs only.',
				confidenceScore: this.normalizeConfidence(parsed.confidenceScore),
				decisionBasis: {
					heatIndexC: this.toNumber(parsed.decisionBasis?.heatIndexC),
					temperatureC: this.toNumber(parsed.decisionBasis?.temperatureC),
					humidityPercent: this.toNumber(parsed.decisionBasis?.humidityPercent),
					heatLevel: String(parsed.decisionBasis?.heatLevel ?? 'unknown'),
					dataSource: String(parsed.decisionBasis?.dataSource ?? 'system'),
					rationale: Array.isArray(parsed.decisionBasis?.rationale)
						? parsed.decisionBasis.rationale.map(String).slice(0, 5)
						: [],
				},
				modelProfile: {
					mode: 'rule-grounded-ai',
					scope: 'system-only',
				},
				healthDetails: {
					symptoms: Array.isArray(symptoms)
						? symptoms.map(String)
						: [],
					triagePriority: (parsed.healthDetails?.triagePriority ?? parsed.triagePriority) ?? (parsed.triage || ''),
					teacherChecklist: Array.isArray(teacherChecklist)
						? teacherChecklist.map(String)
						: [],
					clinicActions: Array.isArray(clinicActions)
						? clinicActions.map(String)
						: [],
					parentChecklist: Array.isArray(parentChecklist)
						? parentChecklist.map(String)
						: [],
					recommendedFluidsAndVolumes: (parsed.healthDetails?.recommendedFluidsAndVolumes ?? parsed.recommendedFluids ?? parsed.fluids) ?? '',
					coolingProcedures: Array.isArray(coolingProcedures)
						? coolingProcedures.map(String)
						: [],
					whenToEscalate: (parsed.healthDetails?.whenToEscalate ?? parsed.whenToEscalate) ?? '',
					sampleAnnouncementText: (parsed.healthDetails?.sampleAnnouncementText ?? parsed.sampleAnnouncementText ?? parsed.announcement) ?? '',
				},
			};

			return this.fillHealthDefaults(mapped, weather);
		}

		const normalizedText = this.normalizeModelText(content);
		if (!normalizedText) {
			return this.fillHealthDefaults(this.buildNormalizedAdvisoryFromText('', weather, languageStyle), weather);
		}

		return this.fillHealthDefaults(this.buildNormalizedAdvisoryFromText(normalizedText, weather, languageStyle), weather);
	}

	private fillHealthDefaults(result: AdvisoryResult, weather: AdvisoryInput['weather']): AdvisoryResult {
		const hi = Number(weather?.heatIndexC ?? result.decisionBasis?.heatIndexC ?? 0);
		const rd: NonNullable<AdvisoryResult['healthDetails']> = result.healthDetails ?? {};

		// Ensure arrays and strings are at least defaults
		rd.symptoms = Array.isArray(rd.symptoms) ? rd.symptoms : [];
		rd.teacherChecklist = Array.isArray(rd.teacherChecklist) ? rd.teacherChecklist : [];
		rd.clinicActions = Array.isArray(rd.clinicActions) ? rd.clinicActions : [];
		rd.parentChecklist = Array.isArray(rd.parentChecklist) ? rd.parentChecklist : [];
		rd.coolingProcedures = Array.isArray(rd.coolingProcedures) ? rd.coolingProcedures : [];
		rd.recommendedFluidsAndVolumes = rd.recommendedFluidsAndVolumes ?? '';
		rd.whenToEscalate = rd.whenToEscalate ?? '';
		rd.sampleAnnouncementText = rd.sampleAnnouncementText ?? '';

		// Determine triage priority if not provided
		if (!rd.triagePriority) {
			if (hi >= 50) rd.triagePriority = 'urgent';
			else if (hi >= 40) rd.triagePriority = 'high';
			else if (hi >= 37) rd.triagePriority = 'monitor';
			else rd.triagePriority = 'low';
		}

		// Fill sensible defaults for checklists when empty
		if (rd.teacherChecklist.length === 0) {
			rd.teacherChecklist = result.actions && result.actions.length > 0 ? result.actions.slice(0, 3) : [];
		}

		if (rd.clinicActions.length === 0) {
			if (hi >= 40) {
				rd.clinicActions = ['Assess airway/breathing', 'Initiate cooling procedures', 'Initiate oral rehydration if conscious and able to swallow'];
			} else {
				rd.clinicActions = ['Assess and monitor for heat stress signs', 'Provide cooling and oral fluids if appropriate'];
			}
		}

		if (rd.parentChecklist.length === 0) {
			rd.parentChecklist = ['Ensure child brings water and light clothing', 'Monitor child for symptoms and pick up if symptoms persist'];
		}

		if (!rd.recommendedFluidsAndVolumes) {
			if (hi >= 40) rd.recommendedFluidsAndVolumes = 'water: 150-250ml every 10-15min for children (age dependent)';
			else rd.recommendedFluidsAndVolumes = 'water: 50-150ml every 15-20min during activity';
		}

		if (!rd.whenToEscalate) {
			rd.whenToEscalate = 'Escalate to clinic if child shows confusion, fainting, persistent vomiting, difficulty breathing, or unresponsiveness.';
		}

		result.healthDetails = rd;
		return result;
	}

	private buildNormalizedAdvisoryFromText(
		modelText: string,
		weather: AdvisoryInput['weather'],
		languageStyle: LanguageStyle
	): AdvisoryResult {
		const fallback = this.buildFallbackAdvisory(
			{ query: '', weather },
			'Provide current school heat safety advisory based on the given weather.',
			languageStyle
		);

		const cleanedText = this.cleanModelNarrative(modelText);
		const extractedSummary = this.extractJsonStringField(cleanedText, 'summary');
		const summary = extractedSummary
			? extractedSummary.slice(0, 220)
			: cleanedText && !cleanedText.trim().startsWith('{')
				? cleanedText.slice(0, 220)
				: fallback.summary;

		const normalizedScopeNote =
			languageStyle === 'tagalog'
				? 'System weather inputs lang ang base ng advisory.'
				: languageStyle === 'taglish'
					? 'System weather inputs lang ang base ng advisory.'
					: 'Advisory is based only on current system weather inputs.';

		return {
			...fallback,
			summary,
			scopeNote: normalizedScopeNote,
			confidenceScore: Math.max(0.72, fallback.confidenceScore),
			decisionBasis: {
				...fallback.decisionBasis,
				rationale: [...(fallback.decisionBasis.rationale ?? [])].slice(0, 5),
			},
		};
	}

	private extractJsonStringField(text: string, fieldName: string): string | null {
		if (!text) {
			return null;
		}

		const marker = `"${fieldName}"`;
		const markerIndex = text.indexOf(marker);
		if (markerIndex === -1) {
			return null;
		}

		const colonIndex = text.indexOf(':', markerIndex + marker.length);
		if (colonIndex === -1) {
			return null;
		}

		let cursor = colonIndex + 1;
		while (cursor < text.length && /\s/.test(text[cursor])) {
			cursor += 1;
		}

		if (text[cursor] !== '"') {
			return null;
		}

		cursor += 1;
		let value = '';
		let escaped = false;
		for (; cursor < text.length; cursor += 1) {
			const character = text[cursor];
			if (escaped) {
				value += character;
				escaped = false;
				continue;
			}

			if (character === '\\') {
				escaped = true;
				continue;
			}

			if (character === '"') {
				return value;
			}

			value += character;
		}

		return null;
	}

	private tryParseAdvisoryPayload(content: string): AdvisoryPayload | null {
		const normalized = this.normalizeModelText(content);
		if (!normalized) {
			return null;
		}

		try {
			return JSON.parse(normalized) as AdvisoryPayload;
		} catch {
			const extracted = this.extractJsonObject(normalized);
			if (!extracted) {
				return null;
			}

			try {
				return JSON.parse(extracted) as AdvisoryPayload;
			} catch {
				return null;
			}
		}
	}

	private normalizeModelText(content: string): string {
		return content
			.replace(/```json/gi, '')
			.replace(/```/g, '')
			.trim();
	}

	private cleanModelNarrative(text: string): string {
		if (!text) {
			return '';
		}

		return text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.filter((line) => !/^here is the json requested\s*:?$/i.test(line))
			.filter((line) => !/^json\s*:?$/i.test(line))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	private extractJsonObject(text: string): string | null {
		const start = text.indexOf('{');
		if (start === -1) {
			return null;
		}

		let depth = 0;
		let inString = false;
		let isEscaped = false;

		for (let index = start; index < text.length; index += 1) {
			const ch = text[index];

			if (isEscaped) {
				isEscaped = false;
				continue;
			}

			if (ch === '\\') {
				isEscaped = true;
				continue;
			}

			if (ch === '"') {
				inString = !inString;
				continue;
			}

			if (inString) {
				continue;
			}

			if (ch === '{') {
				depth += 1;
			}

			if (ch === '}') {
				depth -= 1;
				if (depth === 0) {
					return text.slice(start, index + 1);
				}
			}
		}

		return null;
	}

	private enforceOutputScope(result: AdvisoryResult, heatLevel: string, languageStyle: LanguageStyle): AdvisoryResult {
		const text = [result.summary, ...result.actions, ...result.safetyTips].join(' ').toLowerCase();
		const blocked = ['wikipedia', 'google', 'internet', 'stock market', 'politics'];
		const hasBlockedContent = blocked.some((token) => text.includes(token));

		if (hasBlockedContent) {
			return this.safeScopeRedirect(heatLevel, languageStyle);
		}

		// Preserve full detail lists generated by the model to allow expanded advisories.
		return {
			...result,
		};
	}

	private buildFallbackAdvisory(input: AdvisoryInput, scopedQuery: string, languageStyle: LanguageStyle): AdvisoryResult {
		const level = input.weather.heatLevel;
		const base = this.safeScopeRedirect(level, languageStyle);

		if (scopedQuery.toLowerCase().includes('out-of-scope')) {
			return base;
		}

		// Special playful fallback for non-heat, lighthearted queries about school/projects
		const q = scopedQuery.toLowerCase();
		const mentionsProject = /capstone|thesis|project/.test(q);
		const mentionsFail = /bagsak|fail|flunk|pasa|pumalya/.test(q);

		if (mentionsProject && mentionsFail) {
			if (languageStyle === 'tagalog' || languageStyle === 'taglish') {
				return {
					...base,
					summary: "Worry not — hindi ako takdang-aralin na magbibigay grade. Kung natatakot ka, huminga muna; humingi ng feedback sa adviser; at mag-ayos ng plan. Kaya mo 'yan! 😄",
					actions: [
						"Humingi ng konkretong feedback mula sa adviser ngayong araw.",
						"Gumawa ng maliit na plan: prioritize tasks at mag-assign ng oras araw-araw.",
						"Mag-practice ng demo o presentation kasama ang kaibigan para confident ka." 
					],
					// include user-requested playful snark as an optional extra reply
					extra: ["sige pre bahala ka sa buhay mo"],
					safetyTips: [
						"Huwag mag-cram — mas epektibo ang steady progress.",
						"Kumain at magpahinga para malinaw ang isip bago mag-review."
					],
					scopeNote: "Lighthearted, non-evaluative support for student project concerns.",
					confidenceScore: 0.5,
					decisionBasis: {
						heatIndexC: input.weather.heatIndexC,
						temperatureC: input.weather.temperatureC,
						humidityPercent: input.weather.humidityPercent,
						heatLevel: input.weather.heatLevel,
						dataSource: input.weather.source,
						rationale: [
							"User requested a lighthearted, non-evaluative reply about project failure.",
						],
					},
					modelProfile: { mode: 'rule-grounded-ai', scope: 'system-only' },
				};
			}

			// English fallback
			return {
				...base,
				summary: "Relax — I'm not the thesis police. You're probably fine. Breathe, ask your adviser for feedback, and take it step by step. You got this! 😄",
				actions: [
					"Ask your adviser for specific feedback and next steps.",
					"Break the remaining work into small tasks and set short deadlines.",
					"Do a mock presentation to build confidence." 
				],
				safetyTips: [
					"Avoid last-minute cramming — rest helps focus.",
					"Eat and hydrate before any defense or demo."
				],
				scopeNote: "Lighthearted, non-evaluative support for project concerns.",
				confidenceScore: 0.5,
				decisionBasis: {
					heatIndexC: input.weather.heatIndexC,
					temperatureC: input.weather.temperatureC,
					humidityPercent: input.weather.humidityPercent,
					heatLevel: input.weather.heatLevel,
					dataSource: input.weather.source,
					rationale: [
						"User requested a lighthearted, non-evaluative reply about project failure.",
					],
				},
				modelProfile: { mode: 'rule-grounded-ai', scope: 'system-only' },
			};
		}

		// Default fallback: standard heat advisory summary
		return {
			...base,
			summary: this.getLocalizedSummary(input.weather.heatIndexC, level, languageStyle),
			confidenceScore: 0.86,
			decisionBasis: {
				heatIndexC: input.weather.heatIndexC,
				temperatureC: input.weather.temperatureC,
				humidityPercent: input.weather.humidityPercent,
				heatLevel: input.weather.heatLevel,
				dataSource: input.weather.source,
				rationale: this.getLocalizedRationale(languageStyle),
			},
			modelProfile: {
				mode: 'rule-grounded-ai',
				scope: 'system-only',
			},
		};
	}

	private safeScopeRedirect(heatLevel: string, languageStyle: LanguageStyle): AdvisoryResult {
		const localized = this.getLocalizedScopeRedirect(heatLevel, languageStyle);

		return {
			summary: localized.summary,
			riskLevel: heatLevel,
			actions: localized.actions,
			safetyTips: localized.safetyTips,
			scopeNote: localized.scopeNote,
			confidenceScore: 0.8,
			decisionBasis: {
				heatIndexC: 0,
				temperatureC: 0,
				humidityPercent: 0,
				heatLevel: heatLevel,
				dataSource: 'system',
				rationale: [
					'Response restricted to in-system heat safety scope.',
				],
			},
			modelProfile: {
				mode: 'rule-grounded-ai',
				scope: 'system-only',
			},
		};
	}

	private normalizeConfidence(value: unknown): number {
		if (typeof value !== 'number' || Number.isNaN(value)) {
			return 0.75;
		}

		if (value < 0) {
			return 0;
		}

		if (value > 1) {
			return 1;
		}

		return Number(value.toFixed(2));
	}

	private toNumber(value: unknown): number {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}

		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
}

export const aiAnalysisService = new AIAnalysisService();
