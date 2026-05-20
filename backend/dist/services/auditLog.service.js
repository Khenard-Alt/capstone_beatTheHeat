"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogService = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const supabase_1 = require("../config/supabase");
const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID ?? '00000000-0000-0000-0000-000000000001';
class AuditLogService {
    constructor() {
        this.localAuditPath = path_1.default.resolve(process.cwd(), 'logs', 'audit-events.jsonl');
        // Cache whether the Supabase table has the `duplicate_count` column to avoid repeated errors
        this.supabaseDuplicateCountAvailable = null;
    }
    async logWeatherSnapshot(snapshot, schoolId = DEFAULT_SCHOOL_ID) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'weather_snapshot',
            schoolId,
            payload: snapshot,
            createdAt: new Date().toISOString(),
        };
        if ((0, supabase_1.isSupabaseConfigured)()) {
            const client = (0, supabase_1.getSupabaseAdminClient)();
            if (client) {
                await this.insertWeatherRows(client, event.id, schoolId, snapshot);
            }
        }
        await this.appendLocal(event);
    }
    async logAiAnalysis(input) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'ai_analysis',
            schoolId: input.schoolId ?? DEFAULT_SCHOOL_ID,
            payload: input,
            createdAt: new Date().toISOString(),
        };
        // If a similar advisory was logged very recently, update that row instead of inserting a new one.
        try {
            const existing = await this.findSimilarRecentAiAnalysis(input, 10, 0.5);
            if (existing) {
                // If we have Supabase and an existing row id, increment duplicate_count and update timestamp.
                if ((0, supabase_1.isSupabaseConfigured)()) {
                    try {
                        const client = (0, supabase_1.getSupabaseAdminClient)();
                        if (client && existing.rowId) {
                            // Only attempt update if we haven't previously detected missing column
                            if (this.supabaseDuplicateCountAvailable === false) {
                                // Skip update; record local note instead
                                await this.appendLocal({
                                    type: 'ai_analysis_duplicate',
                                    originalId: existing.rowId ?? null,
                                    schoolId: input.schoolId ?? DEFAULT_SCHOOL_ID,
                                    payload: input,
                                    note: 'Supabase missing duplicate_count column; recorded locally instead of updating.',
                                    createdAt: new Date().toISOString(),
                                });
                            }
                            else {
                                const currentCount = Number(existing.row.duplicate_count ?? 0) || 0;
                                try {
                                    const { error } = await client
                                        .from('ai_analysis_logs')
                                        .update({ duplicate_count: currentCount + 1, updated_at: new Date().toISOString() })
                                        .eq('id', existing.rowId);
                                    if (error) {
                                        // If error indicates missing column, cache and fallback to local note
                                        const msg = String(error.message || error);
                                        if (msg.includes('duplicate_count')) {
                                            this.supabaseDuplicateCountAvailable = false;
                                            console.warn('Supabase schema missing `duplicate_count`; will skip future updates.');
                                            await this.appendLocal({
                                                type: 'ai_analysis_duplicate',
                                                originalId: existing.rowId ?? null,
                                                schoolId: input.schoolId ?? DEFAULT_SCHOOL_ID,
                                                payload: input,
                                                note: 'Supabase missing duplicate_count column; recorded locally instead of updating.',
                                                createdAt: new Date().toISOString(),
                                            });
                                        }
                                        else {
                                            console.warn('Failed to update duplicate_count on ai_analysis_logs:', msg);
                                        }
                                    }
                                    else {
                                        // update appeared successful; mark column as available
                                        this.supabaseDuplicateCountAvailable = true;
                                    }
                                }
                                catch (err) {
                                    const msg = String(err || '');
                                    if (msg.includes('duplicate_count')) {
                                        this.supabaseDuplicateCountAvailable = false;
                                        console.warn('Supabase schema missing `duplicate_count`; will skip future updates.');
                                        try {
                                            await this.appendLocal({
                                                type: 'ai_analysis_duplicate',
                                                originalId: existing.rowId ?? null,
                                                schoolId: input.schoolId ?? DEFAULT_SCHOOL_ID,
                                                payload: input,
                                                note: 'Supabase missing duplicate_count column; recorded locally instead of updating.',
                                                createdAt: new Date().toISOString(),
                                            });
                                        }
                                        catch {
                                            // ignore
                                        }
                                    }
                                    else {
                                        console.warn('Failed to update existing ai_analysis_logs row:', err);
                                    }
                                }
                            }
                        }
                    }
                    catch (err) {
                        console.warn('Failed to update existing ai_analysis_logs row:', err);
                    }
                }
                else {
                    // Local-only: append a duplicate-skipped note to local log for audit.
                    try {
                        await this.appendLocal({
                            type: 'ai_analysis_duplicate',
                            originalId: existing.rowId ?? null,
                            schoolId: input.schoolId ?? DEFAULT_SCHOOL_ID,
                            payload: input,
                            note: `Duplicate of recent advisory within window; skipped insert.`,
                            createdAt: new Date().toISOString(),
                        });
                    }
                    catch (err) {
                        // ignore
                    }
                }
                console.debug('Updated existing recent ai_analysis instead of inserting duplicate.');
                return;
            }
        }
        catch (err) {
            console.warn('Duplicate check/update failed, continuing to log advisory:', err);
        }
        if ((0, supabase_1.isSupabaseConfigured)()) {
            const client = (0, supabase_1.getSupabaseAdminClient)();
            if (client) {
                const { error } = await client.from('ai_analysis_logs').insert({
                    id: event.id,
                    school_id: event.schoolId,
                    model: input.model,
                    request_query: input.query,
                    source: input.source,
                    weather_snapshot: input.weather,
                    ai_response: input.responseText,
                    tokens_input: input.tokenInput ?? null,
                    tokens_output: input.tokenOutput ?? null,
                    tokens_total: input.tokenTotal ?? null,
                    estimated_cost_usd: input.estimatedCostUsd ?? null,
                    created_at: event.createdAt,
                });
                if (error) {
                    console.error('Failed to insert ai_analysis_logs row:', error.message);
                }
            }
        }
        await this.appendLocal(event);
    }
    async findSimilarRecentAiAnalysis(input, windowMinutes = 10, heatTolerance = 0.5) {
        const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
        // parse the advisory response if possible
        let parsedResponse = null;
        try {
            parsedResponse = typeof input.responseText === 'string' ? JSON.parse(input.responseText) : input.responseText;
        }
        catch {
            parsedResponse = null;
        }
        const targetHeat = Number(input.weather?.heatIndexC ?? 0);
        const targetLevel = parsedResponse?.decisionBasis?.heatLevel ?? parsedResponse?.riskLevel ?? null;
        if ((0, supabase_1.isSupabaseConfigured)()) {
            try {
                const client = (0, supabase_1.getSupabaseAdminClient)();
                if (client) {
                    const { data, error } = await client
                        .from('ai_analysis_logs')
                        .select('id, ai_response, weather_snapshot, created_at')
                        .eq('school_id', input.schoolId ?? DEFAULT_SCHOOL_ID)
                        .gte('created_at', cutoff)
                        .order('created_at', { ascending: false })
                        .limit(50);
                    if (error) {
                        console.warn('Supabase duplicate-check query failed:', error.message);
                    }
                    else if (Array.isArray(data)) {
                        for (const row of data) {
                            const ws = row.weather_snapshot ?? {};
                            const rowHeat = Number(ws.heatIndexC ?? 0);
                            if (Number.isFinite(rowHeat) && Math.abs(rowHeat - targetHeat) <= heatTolerance) {
                                // try parse ai_response
                                try {
                                    const r = typeof row.ai_response === 'string' ? JSON.parse(row.ai_response) : row.ai_response;
                                    const rowLevel = r?.decisionBasis?.heatLevel ?? r?.riskLevel ?? null;
                                    if (rowLevel && targetLevel && String(rowLevel) === String(targetLevel)) {
                                        return { rowId: row.id, row };
                                    }
                                }
                                catch {
                                    // ignore parse errors
                                }
                            }
                        }
                    }
                }
            }
            catch (err) {
                console.warn('Duplicate-check supabase path failed:', err);
            }
        }
        // Fallback: scan local JSONL last N lines
        try {
            const local = await Promise.resolve().then(() => __importStar(require('fs')));
            if (await this.pathExists(this.localAuditPath)) {
                const content = local.readFileSync(this.localAuditPath, 'utf-8');
                const lines = content.trim().split(/\r?\n/).reverse();
                for (const line of lines) {
                    try {
                        const evt = JSON.parse(line);
                        if (evt?.type !== 'ai_analysis')
                            continue;
                        if ((evt.schoolId ?? DEFAULT_SCHOOL_ID) !== (input.schoolId ?? DEFAULT_SCHOOL_ID))
                            continue;
                        if (evt.createdAt && evt.createdAt < cutoff)
                            break; // older than window
                        const payload = evt.payload ?? {};
                        const ws = payload.weather ?? {};
                        const rowHeat = Number(ws.heatIndexC ?? 0);
                        if (Number.isFinite(rowHeat) && Math.abs(rowHeat - targetHeat) <= heatTolerance) {
                            const r = payload.responseText ? (typeof payload.responseText === 'string' ? JSON.parse(payload.responseText) : payload.responseText) : null;
                            const rowLevel = r?.decisionBasis?.heatLevel ?? r?.riskLevel ?? null;
                            if (rowLevel && targetLevel && String(rowLevel) === String(targetLevel)) {
                                return { rowId: evt.id ?? null, row: evt };
                            }
                        }
                    }
                    catch {
                        continue;
                    }
                }
            }
        }
        catch (err) {
            // best-effort: ignore errors
        }
        return null;
    }
    async insertWeatherRows(client, id, schoolId, snapshot) {
        const weatherInsert = await client.from('weather_data').insert({
            id,
            school_id: schoolId,
            source: snapshot.source,
            location: snapshot.location,
            temperature_c: snapshot.temperatureC,
            humidity_percent: snapshot.humidityPercent,
            condition: snapshot.condition,
            wind_speed_mps: snapshot.windSpeedMps,
            pressure_hpa: snapshot.pressureHpa,
            observed_at: snapshot.timestamp,
            created_at: new Date().toISOString(),
            raw_payload: snapshot,
        });
        if (weatherInsert.error) {
            console.error('Failed to insert weather_data row:', weatherInsert.error.message);
        }
        const heatIndexInsert = await client.from('heat_index_logs').insert({
            id: (0, crypto_1.randomUUID)(),
            school_id: schoolId,
            weather_data_id: id,
            heat_index_c: snapshot.heatIndexC,
            heat_level: snapshot.heatLevel,
            observed_at: snapshot.timestamp,
            created_at: new Date().toISOString(),
        });
        if (heatIndexInsert.error) {
            console.error('Failed to insert heat_index_logs row:', heatIndexInsert.error.message);
        }
    }
    async appendLocal(event) {
        try {
            await (0, promises_1.mkdir)(path_1.default.dirname(this.localAuditPath), { recursive: true });
            await (0, promises_1.appendFile)(this.localAuditPath, `${JSON.stringify(event)}\n`, 'utf-8');
        }
        catch (error) {
            console.error('Failed to append local audit log:', error);
        }
    }
    async pathExists(p) {
        try {
            await (0, promises_1.access)(p);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.auditLogService = new AuditLogService();
//# sourceMappingURL=auditLog.service.js.map