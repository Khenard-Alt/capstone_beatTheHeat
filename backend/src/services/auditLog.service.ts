import { mkdir, appendFile, access } from 'fs/promises';
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

    // If a similar advisory was logged very recently, update that row instead of inserting a new one.
    try {
      const existing = await this.findSimilarRecentAiAnalysis(input, 10, 0.5);
      if (existing) {
        // If we have Supabase and an existing row id, increment duplicate_count and update timestamp.
        if (isSupabaseConfigured()) {
          try {
            const client = getSupabaseAdminClient();
            if (client && existing.rowId) {
              const currentCount = Number(existing.row.duplicate_count ?? 0) || 0;
              const { error } = await client
                .from('ai_analysis_logs')
                .update({ duplicate_count: currentCount + 1, updated_at: new Date().toISOString() })
                .eq('id', existing.rowId);
              if (error) {
                console.warn('Failed to update duplicate_count on ai_analysis_logs:', error.message);
              }
            }
          } catch (err) {
            console.warn('Failed to update existing ai_analysis_logs row:', err);
          }
        } else {
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
          } catch (err) {
            // ignore
          }
        }

        console.debug('Updated existing recent ai_analysis instead of inserting duplicate.');
        return;
      }
    } catch (err) {
      console.warn('Duplicate check/update failed, continuing to log advisory:', err);
    }

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

  private async findSimilarRecentAiAnalysis(input: AILogInput, windowMinutes = 10, heatTolerance = 0.5): Promise<{ rowId?: string | null; row?: any } | null> {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    // parse the advisory response if possible
    let parsedResponse: any = null;
    try {
      parsedResponse = typeof input.responseText === 'string' ? JSON.parse(input.responseText) : input.responseText;
    } catch {
      parsedResponse = null;
    }

    const targetHeat = Number(input.weather?.heatIndexC ?? 0);
    const targetLevel = parsedResponse?.decisionBasis?.heatLevel ?? parsedResponse?.riskLevel ?? null;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabaseAdminClient();
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
          } else if (Array.isArray(data)) {
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
                } catch {
                  // ignore parse errors
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Duplicate-check supabase path failed:', err);
      }
    }

    // Fallback: scan local JSONL last N lines
    try {
      const local = await import('fs');
      if (await this.pathExists(this.localAuditPath)) {
        const content = local.readFileSync(this.localAuditPath, 'utf-8');
        const lines = content.trim().split(/\r?\n/).reverse();
        for (const line of lines) {
          try {
            const evt = JSON.parse(line);
            if (evt?.type !== 'ai_analysis') continue;
            if ((evt.schoolId ?? DEFAULT_SCHOOL_ID) !== (input.schoolId ?? DEFAULT_SCHOOL_ID)) continue;
            if (evt.createdAt && evt.createdAt < cutoff) break; // older than window
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
          } catch {
            continue;
          }
        }
      }
    } catch (err) {
      // best-effort: ignore errors
    }

    return null;
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

  private async pathExists(p: string): Promise<boolean> {
    try {
      await access(p);
      return true;
    } catch {
      return false;
    }
  }
}

export const auditLogService = new AuditLogService();
