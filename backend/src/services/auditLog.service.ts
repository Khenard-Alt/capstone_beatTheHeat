import { mkdir, appendFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../config/supabase';
import { WeatherSnapshot } from '../types';

const DEFAULT_SCHOOL_ID =
  process.env.DEFAULT_SCHOOL_ID ?? '00000000-0000-0000-0000-000000000001';

interface AILogInput {
  schoolId?: string;
  query: string;
  weather: WeatherSnapshot;
  model: string;
  responseText: string;
  tokenInput?: number;
  tokenOutput?: number;
  tokenTotal?: number;
  estimatedCostUsd?: number;
  source: 'gemini' | 'fallback' | 'python';
}

class AuditLogService {
  private readonly localAuditPath = path.resolve(process.cwd(), 'logs', 'audit-events.jsonl');

  public async logWeatherSnapshot(snapshot: WeatherSnapshot, schoolId = DEFAULT_SCHOOL_ID): Promise<void> {
    const event = {
      id: randomUUID(),
      type: 'weather_snapshot',
      schoolId,
      payload: snapshot,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const client = getSupabaseAdminClient();
      if (client) {
        await this.insertWeatherRows(client, event.id, schoolId, snapshot);
      }
    }

    await this.appendLocal(event);
  }

  public async logAiAnalysis(input: AILogInput): Promise<void> {
    const event = {
      id: randomUUID(),
      type: 'ai_analysis',
      schoolId: input.schoolId ?? DEFAULT_SCHOOL_ID,
      payload: input,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const client = getSupabaseAdminClient();
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

  private async insertWeatherRows(
    client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
    id: string,
    schoolId: string,
    snapshot: WeatherSnapshot
  ): Promise<void> {
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
      id: randomUUID(),
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

  private async appendLocal(event: unknown): Promise<void> {
    try {
      await mkdir(path.dirname(this.localAuditPath), { recursive: true });
      await appendFile(this.localAuditPath, `${JSON.stringify(event)}\n`, 'utf-8');
    } catch (error) {
      console.error('Failed to append local audit log:', error);
    }
  }
}

export const auditLogService = new AuditLogService();
