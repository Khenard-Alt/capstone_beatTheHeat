"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = void 0;
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const environment_1 = require("../config/environment");
const auditLog_service_1 = require("./auditLog.service");
const projectPolicyFAQ_1 = require("../knowledge/projectPolicyFAQ");
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite'];
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class AIAnalysisService {
    constructor() {
        this.knowledgeCache = null;
    }
    async generateScopedAdvisory(input) {
        const rawQuery = typeof input.query === 'string' ? input.query : '';
        const scopedQuery = this.scopeUserQuery(rawQuery);
        const languageStyle = this.detectLanguageStyle(rawQuery || scopedQuery);
        const intent = this.detectConversationIntent(rawQuery);
        const variationSeed = this.getVariationSeed();
        if (this.classifyScope(rawQuery) === 'out-of-scope') {
            const refusal = this.buildScopeRefusalAdvisory(input.weather, languageStyle);
            const variedRefusal = this.applyVariation(refusal, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedRefusal, 'fallback', 'scope-guard');
            return variedRefusal;
        }
        const scenarioTemplate = this.buildScenarioTemplateAdvisory(intent, input.weather, languageStyle);
        if (scenarioTemplate) {
            const variedTemplate = this.applyVariation(scenarioTemplate, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedTemplate, 'fallback', 'intent-template');
            return variedTemplate;
        }
        if (environment_1.env.aiModelProvider === 'python') {
            const pythonResult = await this.generatePythonAdvisory(input, scopedQuery, languageStyle, variationSeed);
            if (pythonResult) {
                return pythonResult;
            }
            const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
            const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
            const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', 'python-fallback');
            return variedFallback;
        }
        if (environment_1.env.aiModelProvider === 'fallback') {
            const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
            const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
            const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', 'fallback-only');
            return variedFallback;
        }
        if (!(0, environment_1.hasGeminiApiKey)()) {
            const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
            const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
            const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', GEMINI_MODELS[0]);
            return variedFallback;
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
                    maxOutputTokens: 220,
                    responseMimeType: 'application/json',
                },
            };
            const { data, modelUsed } = await this.requestGeminiContent(requestBody);
            const parts = data?.candidates?.[0]?.content?.parts ?? [];
            const content = parts
                .map((part) => (typeof part.text === 'string' ? part.text : ''))
                .join('\n')
                .trim();
            const parsed = this.parseAdvisory(content, input.weather, languageStyle);
            const result = this.enforceOutputScope(parsed, input.weather.heatLevel, languageStyle);
            const adjustedResult = this.applyQueryPolicy(result, input, scopedQuery, languageStyle);
            const variedResult = this.applyVariation(adjustedResult, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedResult, 'gemini', modelUsed, data.usageMetadata?.promptTokenCount, data.usageMetadata?.candidatesTokenCount, data.usageMetadata?.totalTokenCount);
            return variedResult;
        }
        catch (error) {
            console.error('AI advisory generation failed, using fallback:', error);
            const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
            const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
            const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', GEMINI_MODELS[0]);
            return variedFallback;
        }
    }
    async generatePythonOnlyAdvisory(input) {
        const rawQuery = typeof input.query === 'string' ? input.query : '';
        const scopedQuery = this.scopeUserQuery(rawQuery);
        const languageStyle = this.detectLanguageStyle(rawQuery || scopedQuery);
        const variationSeed = this.getVariationSeed();
        if (this.classifyScope(rawQuery) === 'out-of-scope') {
            const refusal = this.buildScopeRefusalAdvisory(input.weather, languageStyle);
            const variedRefusal = this.applyVariation(refusal, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedRefusal, 'fallback', 'scope-guard');
            return variedRefusal;
        }
        const pythonResult = await this.generatePythonAdvisory(input, scopedQuery, languageStyle, variationSeed);
        if (pythonResult) {
            return pythonResult;
        }
        const fallback = this.buildFallbackAdvisory(input, scopedQuery, languageStyle);
        const adjustedFallback = this.applyQueryPolicy(fallback, input, scopedQuery, languageStyle);
        const variedFallback = this.applyVariation(adjustedFallback, variationSeed, languageStyle);
        await this.logAdvisoryAudit(input, scopedQuery, variedFallback, 'fallback', 'python-fallback');
        return variedFallback;
    }
    async requestGeminiContent(requestBody) {
        let lastError;
        for (const model of GEMINI_MODELS) {
            try {
                const { data } = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${environment_1.env.googleGeminiApiKey}`, requestBody, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                });
                return { data, modelUsed: model };
            }
            catch (error) {
                lastError = error;
                if (axios_1.default.isAxiosError(error)) {
                    const status = error.response?.status;
                    const message = typeof error.response?.data === 'string'
                        ? error.response.data
                        : JSON.stringify(error.response?.data ?? {});
                    console.error(`Gemini model ${model} failed with status ${status ?? 'N/A'}: ${message}`);
                }
                else {
                    console.error(`Gemini model ${model} failed with non-axios error`, error);
                }
            }
        }
        throw lastError ?? new Error('All configured Gemini models failed.');
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
    async generatePythonAdvisory(input, scopedQuery, languageStyle, variationSeed) {
        const resolved = await this.resolvePythonModelPaths();
        if (!resolved) {
            console.warn('Python advisory model paths not found.');
            return null;
        }
        const pythonExecutable = await this.resolvePythonExecutable();
        const tmpDir = await (0, promises_1.mkdtemp)(path_1.default.join(os_1.default.tmpdir(), 'bth-ai-'));
        const inputPath = path_1.default.join(tmpDir, 'input.json');
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
            await (0, promises_1.writeFile)(inputPath, JSON.stringify(payload), 'utf-8');
            const { stdout } = await execFileAsync(pythonExecutable, [
                resolved.scriptPath,
                'predict',
                '--model-dir',
                resolved.modelDir,
                '--input-json',
                inputPath,
                '--language',
                pythonLanguage,
            ], { timeout: 45000 });
            const parsed = this.parseAdvisory(String(stdout).trim(), input.weather, languageStyle);
            const result = this.enforceOutputScope(parsed, input.weather.heatLevel, languageStyle);
            const adjustedResult = this.applyQueryPolicy(result, input, scopedQuery, languageStyle);
            const variedResult = this.applyVariation(adjustedResult, variationSeed, languageStyle);
            await this.logAdvisoryAudit(input, scopedQuery, variedResult, 'python', 'local-sklearn');
            return variedResult;
        }
        catch (error) {
            console.error('Python advisory generation failed:', error);
            return null;
        }
        finally {
            await (0, promises_1.rm)(tmpDir, { recursive: true, force: true });
        }
    }
    async resolvePythonModelPaths() {
        const scriptCandidates = [
            environment_1.env.pythonScriptPath,
            path_1.default.resolve(process.cwd(), 'components', 'AIModel', 'python', 'ai.py'),
        ];
        const modelCandidates = [
            environment_1.env.pythonModelDir,
            path_1.default.resolve(process.cwd(), 'components', 'AIModel', 'python', 'model'),
        ];
        const scriptPath = await this.pickExistingPath(scriptCandidates);
        const modelDir = await this.pickExistingPath(modelCandidates);
        if (!scriptPath || !modelDir) {
            return null;
        }
        return { scriptPath, modelDir };
    }
    async resolvePythonExecutable() {
        const candidates = [environment_1.env.pythonExecutable, 'python'];
        for (const candidate of candidates) {
            if (await this.pathExists(candidate)) {
                return candidate;
            }
        }
        return 'python';
    }
    async pickExistingPath(paths) {
        for (const candidate of paths) {
            if (await this.pathExists(candidate)) {
                return candidate;
            }
        }
        return null;
    }
    async pathExists(candidate) {
        try {
            await (0, promises_1.access)(candidate);
            return true;
        }
        catch {
            return false;
        }
    }
    systemPrompt(knowledgeContext) {
        const policyKnowledge = this.buildPolicyKnowledgeBlock();
        return [
            'You are a school heat safety advisory assistant for Beat The Heat.',
            'Prioritize the provided weather and heat-index data when giving heat safety guidance.',
            'Avoid medical diagnosis, legal advice, or unsafe instructions.',
            'If a question is not about heat safety, respond in a friendly, supportive tone and gently steer back to heat and school safety topics.',
            'Keep responses human, brief, and supportive. You may acknowledge feelings and ask a clarifying question before giving guidance.',
            'Return strict JSON object with keys: summary, riskLevel, actions, safetyTips, scopeNote, confidenceScore, decisionBasis, modelProfile.',
            'decisionBasis must include: heatIndexC, temperatureC, humidityPercent, heatLevel, dataSource, rationale.',
            'modelProfile must include: mode and scope.',
            'confidenceScore must be a number from 0.00 to 1.00.',
            'actions and safetyTips must be arrays of concise strings.',
            'If user asks about class suspension, answer directly with current heat-level implication and remind that final suspension decision is by school leadership and local DepEd authority.',
            'Always follow the language style of the user query: English to English, Tagalog to Tagalog, mixed Taglish to Taglish.',
            'Answer any question that is within heat safety, school advisories, weather impact, class activity safety, or parent/student precaution scope.',
            'If a variationHint is provided, use it to vary phrasing subtly without mentioning it.',
            `PROJECT POLICY KNOWLEDGE: ${policyKnowledge}`,
            knowledgeContext ? `KNOWLEDGE BASE: ${knowledgeContext}` : '',
            'Keep tone practical for school administrators, teachers, and parents.',
        ].join(' ');
    }
    getVariationSeed() {
        return Math.floor(Date.now() / 60000) % 3;
    }
    buildVariationHint(seed, languageStyle) {
        const styles = languageStyle === 'tagalog'
            ? ['Maikli at diretso.', 'Praktikal at mahinahon.', 'May kaunting urgency pero calm.']
            : languageStyle === 'taglish'
                ? ['Short and direct.', 'Practical and calm.', 'Slightly urgent but calm.']
                : ['Short and direct.', 'Practical and calm.', 'Slightly urgent but calm.'];
        return styles[Math.abs(seed) % styles.length];
    }
    applyVariation(result, seed, languageStyle) {
        const suffix = this.getVariationSuffix(seed, languageStyle);
        const summary = suffix && !result.summary.includes(suffix)
            ? `${result.summary} ${suffix}`.trim()
            : result.summary;
        return {
            ...result,
            summary,
            actions: this.rotateList(result.actions, seed),
            safetyTips: this.rotateList(result.safetyTips, seed),
        };
    }
    rotateList(list, seed) {
        if (list.length <= 1) {
            return list;
        }
        const offset = Math.abs(seed) % list.length;
        return [...list.slice(offset), ...list.slice(0, offset)];
    }
    getVariationSuffix(seed, languageStyle) {
        const suffixes = languageStyle === 'tagalog'
            ? ['Bantayan ang hydration ngayon.', 'Mag-abang ng school updates.', 'Iwasan ang peak heat exposure.']
            : languageStyle === 'taglish'
                ? ['Keep hydration in mind today.', 'Stand by for school updates.', 'Avoid peak heat exposure.']
                : ['Keep hydration in mind today.', 'Stand by for school updates.', 'Avoid peak heat exposure.'];
        return suffixes[Math.abs(seed) % suffixes.length];
    }
    async buildKnowledgeContext(query) {
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
    async getKnowledgeCache() {
        if (this.knowledgeCache) {
            return this.knowledgeCache;
        }
        const docs = new Map();
        const handbookPath = path_1.default.resolve(process.cwd(), 'docs', 'text', 'AI_ASSISTANT_HANDBOOK.md');
        const handbook = await this.readTextFileSafe(handbookPath);
        const docPaths = [
            path_1.default.resolve(process.cwd(), 'docs', 'text', 'PROJECT_SCOPE.md'),
            path_1.default.resolve(process.cwd(), 'docs', 'text', 'PRINCIPAL_SPEC.md'),
            path_1.default.resolve(process.cwd(), 'docs', 'text', 'DEVELOPMENT_GUIDE.md'),
            path_1.default.resolve(process.cwd(), 'docs', 'text', 'CAPSTONE_DOCUMENTATION.md'),
        ];
        for (const docPath of docPaths) {
            const content = await this.readTextFileSafe(docPath);
            if (content) {
                docs.set(path_1.default.basename(docPath), content);
            }
        }
        this.knowledgeCache = { handbook, docs };
        return this.knowledgeCache;
    }
    async readTextFileSafe(filePath) {
        try {
            const content = await (0, promises_1.readFile)(filePath, 'utf-8');
            const normalized = content.replace(/\r\n/g, '\n').trim();
            return normalized.slice(0, 6000);
        }
        catch {
            return null;
        }
    }
    extractRelevantNotes(query, docs) {
        const tokens = query
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length >= 3);
        if (tokens.length === 0 || docs.size === 0) {
            return '';
        }
        const snippets = [];
        for (const [source, content] of docs.entries()) {
            const paragraphs = content.split(/\n\s*\n/).map((paragraph) => paragraph.trim());
            for (const paragraph of paragraphs) {
                if (!paragraph)
                    continue;
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
    classifyScope(query) {
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
            'nba',
            'finals',
            'love poem',
            'poem',
            'lyrics',
            'horoscope',
            'recipe',
        ];
        if (outOfScopeSignals.some((token) => lowered.includes(token))) {
            return 'in-scope';
        }
        return 'in-scope';
    }
    buildPolicyKnowledgeBlock() {
        const policy = projectPolicyFAQ_1.projectPolicyFAQ.policy;
        const faq = projectPolicyFAQ_1.projectPolicyFAQ.parentFAQ
            .map((item) => `Q: ${item.q} A: ${item.a}`)
            .join(' | ');
        return [
            `Allowed topics: ${projectPolicyFAQ_1.projectPolicyFAQ.scope.allowedTopics.join(', ')}`,
            `Refusal rule: ${projectPolicyFAQ_1.projectPolicyFAQ.scope.refusalRule}`,
            `Authority: ${policy.authority}`,
            `Heat thresholds C: safe ${policy.thresholdsC.safe}, caution ${policy.thresholdsC.caution}, extreme-caution ${policy.thresholdsC.extremeCaution}, danger ${policy.thresholdsC.danger}, extreme-danger ${policy.thresholdsC.extremeDanger}`,
            `Operational guidance: ${policy.operationalGuidance.join(' | ')}`,
            `Parent FAQ: ${faq}`,
        ].join(' ');
    }
    detectConversationIntent(query) {
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
    buildScenarioTemplateAdvisory(intent, weather, languageStyle) {
        if (intent === 'general' || intent === 'suspension') {
            return null;
        }
        const base = this.buildFallbackAdvisory({ query: '', weather }, 'Provide current school heat safety advisory based on the given weather.', languageStyle);
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
    getScenarioTemplate(intent, weather, languageStyle) {
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
                summary: languageStyle === 'taglish'
                    ? `Hi parent. Current heat index is ${hi}°C (${level}). Ready akong tumulong sa heat-safety questions para sa child mo.`
                    : `Hi parent. Current heat index is ${hi}°C (${level}). I can help with practical heat-safety guidance for your child.`,
                actions: languageStyle === 'taglish'
                    ? ['Ask about outdoor safety, hydration, warning signs, or class suspension guidance.', 'Pwede ka rin magtanong about what to bring during hot days.']
                    : ['Ask about outdoor safety, hydration, warning signs, or class suspension guidance.', 'You can also ask what your child should bring during hot days.'],
                safetyTips: languageStyle === 'taglish'
                    ? ['Keep your child hydrated throughout the day.', 'Monitor school announcements for schedule updates.']
                    : ['Keep your child hydrated throughout the day.', 'Monitor school announcements for schedule updates.'],
                scopeNote: languageStyle === 'taglish'
                    ? 'Heat-advisory scope lang ang assistant na ito.'
                    : 'This assistant stays within heat-safety advisory scope only.',
            };
        }
        if (intent === 'thanks') {
            return {
                summary: languageStyle === 'taglish'
                    ? 'You are welcome. Nandito ako to support your heat-safety decisions as a parent.'
                    : 'You are welcome. I am here to support your heat-safety decisions as a parent.',
                actions: languageStyle === 'taglish'
                    ? ['You can ask current risk level before outdoor activities.', 'Pwede mo rin itanong if safe ang PE or recess today.']
                    : ['You can ask current risk level before outdoor activities.', 'You can also ask if PE or recess is safe today.'],
                safetyTips: languageStyle === 'taglish'
                    ? ['Prepare water bottle and light clothing for your child.', 'Avoid heavy outdoor exposure during peak heat hours.']
                    : ['Prepare water bottle and light clothing for your child.', 'Avoid heavy outdoor exposure during peak heat hours.'],
                scopeNote: languageStyle === 'taglish'
                    ? 'Project heat-advisory scope only para consistent and safe ang guidance.'
                    : 'Project heat-advisory scope only for consistent and safe guidance.',
            };
        }
        if (intent === 'capability') {
            return {
                summary: languageStyle === 'taglish'
                    ? 'I can answer parent questions about heat index, weather impact, student precautions, and school safety advisories. AI performance rating: 80%.'
                    : 'I can answer parent questions about heat index, weather impact, student precautions, and school safety advisories. AI performance rating: 80%.',
                actions: languageStyle === 'taglish'
                    ? ['Ask about hydration frequency, outdoor safety, warning signs, and class suspension guidance.', 'Use English, Tagalog, or Taglish and I will adapt.']
                    : ['Ask about hydration frequency, outdoor safety, warning signs, and class suspension guidance.', 'Use English, Tagalog, or Taglish and I will adapt.'],
                safetyTips: languageStyle === 'taglish'
                    ? ['Use current heat condition for more precise response.', 'Follow official school and DepEd announcements for final decisions.']
                    : ['Use current heat condition for more precise response.', 'Follow official school and DepEd announcements for final decisions.'],
                scopeNote: languageStyle === 'taglish'
                    ? 'Hindi ako open-topic chatbot; project scope lang ang sagot ko.'
                    : 'I am not an open-topic chatbot; I stay within project scope.',
            };
        }
        if (intent === 'urgent-symptoms') {
            return {
                summary: languageStyle === 'taglish'
                    ? 'If your child has dizziness, vomiting, severe headache, or confusion, treat this as urgent and refer to school clinic or nearest health provider immediately.'
                    : 'If your child has dizziness, vomiting, severe headache, or confusion, treat this as urgent and refer to school clinic or nearest health provider immediately.',
                actions: languageStyle === 'taglish'
                    ? ['Stop outdoor activity and move the child to a cool shaded area.', 'Provide water if the child is conscious and can drink.', 'Notify class adviser and school clinic immediately.']
                    : ['Stop outdoor activity and move the child to a cool shaded area.', 'Provide water if the child is conscious and can drink.', 'Notify class adviser and school clinic immediately.'],
                safetyTips: languageStyle === 'taglish'
                    ? ['Do not force the child to continue activity while symptomatic.', 'Seek medical assessment if symptoms persist or worsen.']
                    : ['Do not force the child to continue activity while symptomatic.', 'Seek medical assessment if symptoms persist or worsen.'],
                scopeNote: languageStyle === 'taglish'
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
    buildScopeRefusalAdvisory(weather, languageStyle) {
        const base = this.buildFallbackAdvisory({ query: '', weather }, 'Provide current school heat safety advisory based on the given weather.', languageStyle);
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
    getScopeRefusalTemplate(languageStyle) {
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
    applyQueryPolicy(result, input, scopedQuery, languageStyle) {
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
    isSuspensionQuery(query) {
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
    getLocalizedSummary(heatIndexC, level, languageStyle) {
        if (languageStyle === 'tagalog') {
            return `Kasalukuyang heat index ay ${heatIndexC}°C (${level}). Unahin ang pag-inom ng tubig, lilim, at bawas na outdoor exposure.`;
        }
        if (languageStyle === 'taglish') {
            return `Current heat index is ${heatIndexC}°C (${level}). Unahin ang hydration, lilim, at bawas outdoor exposure.`;
        }
        return `Current heat index is ${heatIndexC}°C (${level}). Prioritize hydration, shade, and reduced outdoor exposure.`;
    }
    getLocalizedRationale(languageStyle) {
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
    getLocalizedScopeRedirect(heatLevel, languageStyle) {
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
    getSuspensionGuidance(heatLevel, languageStyle) {
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
    getAuthorityNote(languageStyle) {
        if (languageStyle === 'tagalog') {
            return 'I-coordinate ang final class suspension decision sa school head at local DepEd office.';
        }
        if (languageStyle === 'taglish') {
            return 'I-coordinate ang final class suspension decision with school head at local DepEd office.';
        }
        return 'Coordinate final class suspension decision with school head and local DepEd office.';
    }
    getSuspensionActionPrefix(languageStyle) {
        if (languageStyle === 'tagalog') {
            return 'Gabay sa class suspension';
        }
        if (languageStyle === 'taglish') {
            return 'Class suspension gabay';
        }
        return 'Class suspension guidance';
    }
    getAnnouncementTip(languageStyle) {
        if (languageStyle === 'tagalog') {
            return 'Mag-abang ng opisyal na announcement mula sa school communication channels.';
        }
        if (languageStyle === 'taglish') {
            return 'Mag-stand by sa official announcements through school communication channels.';
        }
        return 'Stand by for official announcements through school communication channels.';
    }
    getSuspensionScopeNote(languageStyle) {
        if (languageStyle === 'tagalog') {
            return 'Ang class suspension guidance ay naka-base sa heat level ng system; ang final authority sa suspension ay nasa school at DepEd leadership pa rin.';
        }
        if (languageStyle === 'taglish') {
            return 'Class suspension guidance ay heat-level based from this system; final suspension authority remains with school at DepEd leadership.';
        }
        return 'Class suspension guidance is heat-level based from this system; final suspension authority remains with school and DepEd leadership.';
    }
    getSuspensionRationale(languageStyle) {
        if (languageStyle === 'tagalog') {
            return 'Na-activate ang suspension response path dahil tungkol sa class suspension ang query.';
        }
        if (languageStyle === 'taglish') {
            return 'Na-activate ang suspension response path because the query is about class suspension.';
        }
        return 'Suspension response path was activated because query is about class suspension.';
    }
    scopeUserQuery(query) {
        return query.trim() || 'Provide current school heat safety advisory based on the given weather.';
    }
    detectLanguageStyle(query) {
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
    parseAdvisory(content, weather, languageStyle) {
        if (!content) {
            return this.buildNormalizedAdvisoryFromText('', weather, languageStyle);
        }
        const parsed = this.tryParseAdvisoryPayload(content);
        if (parsed) {
            return {
                summary: parsed.summary ?? 'No summary provided.',
                riskLevel: parsed.riskLevel ?? 'unknown',
                actions: Array.isArray(parsed.actions) ? parsed.actions.map(String) : [],
                safetyTips: Array.isArray(parsed.safetyTips) ? parsed.safetyTips.map(String) : [],
                scopeNote: parsed.scopeNote ??
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
            };
        }
        const normalizedText = this.normalizeModelText(content);
        if (!normalizedText) {
            return this.buildNormalizedAdvisoryFromText('', weather, languageStyle);
        }
        return this.buildNormalizedAdvisoryFromText(normalizedText, weather, languageStyle);
    }
    buildNormalizedAdvisoryFromText(modelText, weather, languageStyle) {
        const fallback = this.buildFallbackAdvisory({ query: '', weather }, 'Provide current school heat safety advisory based on the given weather.', languageStyle);
        const cleanedText = this.cleanModelNarrative(modelText);
        const summary = cleanedText
            ? cleanedText.slice(0, 220)
            : fallback.summary;
        const normalizedScopeNote = languageStyle === 'tagalog'
            ? 'Na-normalize ang model output format, pero ang advisory ay naka-base pa rin sa current heat data ng system.'
            : languageStyle === 'taglish'
                ? 'Na-normalize ang model output format, pero advisory is still based on current system heat data.'
                : 'Model output format was normalized, and advisory remains grounded on current system heat data.';
        return {
            ...fallback,
            summary,
            scopeNote: normalizedScopeNote,
            confidenceScore: Math.max(0.72, fallback.confidenceScore),
            decisionBasis: {
                ...fallback.decisionBasis,
                rationale: [
                    ...(fallback.decisionBasis.rationale ?? []),
                    'Model output was converted to the advisory schema while preserving weather-grounded recommendations.',
                ].slice(0, 5),
            },
        };
    }
    tryParseAdvisoryPayload(content) {
        const normalized = this.normalizeModelText(content);
        if (!normalized) {
            return null;
        }
        try {
            return JSON.parse(normalized);
        }
        catch {
            const extracted = this.extractJsonObject(normalized);
            if (!extracted) {
                return null;
            }
            try {
                return JSON.parse(extracted);
            }
            catch {
                return null;
            }
        }
    }
    normalizeModelText(content) {
        return content
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
    }
    cleanModelNarrative(text) {
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
    extractJsonObject(text) {
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
    enforceOutputScope(result, heatLevel, languageStyle) {
        const text = [result.summary, ...result.actions, ...result.safetyTips].join(' ').toLowerCase();
        const blocked = ['wikipedia', 'google', 'internet', 'stock market', 'politics'];
        const hasBlockedContent = blocked.some((token) => text.includes(token));
        if (hasBlockedContent) {
            return this.safeScopeRedirect(heatLevel, languageStyle);
        }
        return {
            ...result,
            actions: result.actions.slice(0, 4),
            safetyTips: result.safetyTips.slice(0, 4),
        };
    }
    buildFallbackAdvisory(input, scopedQuery, languageStyle) {
        const level = input.weather.heatLevel;
        const base = this.safeScopeRedirect(level, languageStyle);
        if (scopedQuery.toLowerCase().includes('out-of-scope')) {
            return base;
        }
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
    safeScopeRedirect(heatLevel, languageStyle) {
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
    normalizeConfidence(value) {
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
    toNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
exports.aiAnalysisService = new AIAnalysisService();
//# sourceMappingURL=aiAnalysis.service.js.map