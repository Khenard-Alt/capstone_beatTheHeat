"use strict";
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
}
exports.auditLogService = new AuditLogService();
//# sourceMappingURL=auditLog.service.js.map