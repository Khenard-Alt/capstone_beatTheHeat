import { Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { getSupabaseAdminClient } from '../config/supabase';

const LOCAL_LOG = path.resolve(process.cwd(), 'logs', 'health-incidents.jsonl');

const loadLocalIncidents = async (): Promise<any[]> => {
  try {
    const raw = await readFile(LOCAL_LOG, 'utf-8');
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as any[];
  } catch {
    return [];
  }
};

export const incidentsController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        const local = await loadLocalIncidents();
        res.status(200).json({
          success: true,
          data: local.slice(offset, offset + limit),
          pagination: { limit, offset, total: local.length },
        });
        return;
      }

      const { data, error, count } = await supabase
        .from('health_incidents')
        .select(
          'id, student_name, grade_level, section, incident_type, severity, symptoms, heat_index, temperature, timestamp, action_taken, reported_by, status',
          { count: 'exact' }
        )
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(200).json({
          success: true,
          data: [],
          pagination: { limit, offset, total: 0 },
          message: 'No incident data available',
        });
        return;
      }

      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        studentName: row.student_name,
        gradeLevel: row.grade_level,
        section: row.section,
        incidentType: row.incident_type,
        severity: row.severity,
        symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
        heatIndex: row.heat_index,
        temperature: row.temperature,
        timestamp: row.timestamp,
        actionTaken: row.action_taken,
        reportedBy: row.reported_by,
        status: row.status,
      }));

      res.status(200).json({
        success: true,
        data: mapped,
        pagination: { limit, offset, total: count || 0 },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default incidentsController;
