"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const auditLog_service_1 = require("./auditLog.service");
class AIAnalysisService {
    async generateScopedAdvisory(input) {
        const scopedQuery = this.scopeUserQuery(input.query);
        if (!(0, environment_1.hasGeminiApiKey)()) {
            const fallback = this.buildFallbackAdvisory(input, scopedQuery);
            await this.logAdvisoryAudit(input, scopedQuery, fallback, 'fallback', 'gemini-pro');
            return fallback;
        }
        try {
            const systemPrompt = this.systemPrompt();
            const userPrompt = JSON.stringify({
                query: scopedQuery,
                weather: input.weather,
                timestamp: new Date().toISOString(),
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
                    maxOutputTokens: 220,
                },
            };
            const { data } = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${environment_1.env.googleGeminiApiKey}`, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });
            const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = this.parseAdvisory(content);
            const result = this.enforceOutputScope(parsed, input.weather.heatLevel);
            await this.logAdvisoryAudit(input, scopedQuery, result, 'gemini', 'gemini-pro', data.usageMetadata?.promptTokenCount, data.usageMetadata?.candidatesTokenCount, data.usageMetadata?.totalTokenCount);
            return result;
        }
        catch (error) {
            console.error('AI advisory generation failed, using fallback:', error);
            const fallback = this.buildFallbackAdvisory(input, scopedQuery);
            await this.logAdvisoryAudit(input, scopedQuery, fallback, 'fallback', 'gemini-pro');
            return fallback;
        }
    }
    async logAdvisoryAudit(input, scopedQuery, result, source, model, tokenInput, tokenOutput, tokenTotal) {
        const responseText = JSON.stringify(result);
        const estimatedCostUsd = tokenTotal ? this.estimateCostUsd(tokenTotal) : undefined;
        try {
            await auditLog_service_1.auditLogService.logAiAnalysis({
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
        }
        catch (error) {
            console.error('Failed to persist ai advisory audit log:', error);
        }
    }
    estimateCostUsd(_totalTokens) {
        // Google Gemini: completely FREE on free tier
        // This is kept for compatibility; cost is always 0
        return 0;
    }
    systemPrompt() {
        return [
            'You are a school heat safety advisory assistant for Beat The Heat.',
            'You can ONLY answer using provided weather and heat-index data.',
            'DO NOT use outside knowledge, web facts, diagnosis, or unrelated medical advice.',
            'If query is outside scope, respond with a scope reminder and safe redirection.',
            'Return strict JSON object with keys: summary, riskLevel, actions, safetyTips, scopeNote.',
            'actions and safetyTips must be arrays of concise strings.',
            'Keep tone practical for school administrators, teachers, and parents.',
        ].join(' ');
    }
    scopeUserQuery(query) {
        const lowered = query.toLowerCase();
        const outOfScopeSignals = ['politics', 'history', 'math', 'movie', 'joke', 'code', 'programming'];
        const hasOutOfScope = outOfScopeSignals.some((word) => lowered.includes(word));
        if (hasOutOfScope) {
            return 'Out-of-scope request detected. Redirect to heat index safety guidance only.';
        }
        return query.trim() || 'Provide current school heat safety advisory based on the given weather.';
    }
    parseAdvisory(content) {
        if (!content) {
            return this.emptyResult();
        }
        try {
            const parsed = JSON.parse(content);
            return {
                summary: parsed.summary ?? 'No summary provided.',
                riskLevel: parsed.riskLevel ?? 'unknown',
                actions: Array.isArray(parsed.actions) ? parsed.actions.map(String) : [],
                safetyTips: Array.isArray(parsed.safetyTips) ? parsed.safetyTips.map(String) : [],
                scopeNote: parsed.scopeNote ??
                    'This response is restricted to system weather and heat-index inputs only.',
            };
        }
        catch {
            return this.emptyResult();
        }
    }
    enforceOutputScope(result, heatLevel) {
        const text = [result.summary, ...result.actions, ...result.safetyTips].join(' ').toLowerCase();
        const blocked = ['wikipedia', 'google', 'internet', 'stock market', 'politics'];
        const hasBlockedContent = blocked.some((token) => text.includes(token));
        if (hasBlockedContent) {
            return this.safeScopeRedirect(heatLevel);
        }
        return {
            ...result,
            actions: result.actions.slice(0, 4),
            safetyTips: result.safetyTips.slice(0, 4),
        };
    }
    buildFallbackAdvisory(input, scopedQuery) {
        const level = input.weather.heatLevel;
        const base = this.safeScopeRedirect(level);
        if (scopedQuery.toLowerCase().includes('out-of-scope')) {
            return base;
        }
        return {
            ...base,
            summary: `Current heat index is ${input.weather.heatIndexC}°C (${level}). Prioritize hydration, shade, and reduced outdoor exposure.`,
        };
    }
    safeScopeRedirect(heatLevel) {
        return {
            summary: `Advisory scope is limited to this system's weather and heat-index data. Current heat level: ${heatLevel}.`,
            riskLevel: heatLevel,
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
    emptyResult() {
        return {
            summary: 'Unable to generate advisory from model output.',
            riskLevel: 'unknown',
            actions: [],
            safetyTips: [],
            scopeNote: 'Fallback response due to invalid model output.',
        };
    }
}
exports.aiAnalysisService = new AIAnalysisService();
//# sourceMappingURL=aiAnalysis.service.js.map