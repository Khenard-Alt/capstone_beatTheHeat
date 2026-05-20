import { Request, Response, NextFunction } from 'express';
import { readFile, appendFile, writeFile } from 'fs/promises';
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

const saveLocalIncidents = async (records: any[]): Promise<void> => {
  const content = records.map((record) => JSON.stringify(record)).join('\n');
  await writeFile(LOCAL_LOG, content ? `${content}\n` : '', 'utf-8');
};

const formatPersonName = (person: any): string | null => {
  if (!person) {
    return null;
  }

  const parts = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
  return parts || person.email || null;
};

const mapIncidentRow = (
  row: any,
  studentsById: Record<string, any>,
  reportersById: Record<string, any>,
  parentsById: Record<string, any>
) => {
  const student = row.student_id ? studentsById[row.student_id] : null;
  const reporter = row.reporter_id ? reportersById[row.reporter_id] : null;
  const parent = student?.parent_user_id ? parentsById[student.parent_user_id] : null;
  const reporterName = formatPersonName(reporter);
  const parentName = formatPersonName(parent);

  return {
    id: row.id,
    schoolId: row.school_id || null,
    reporterId: row.reporter_id || null,
    reporterName,
    reporterRole: reporter?.role || null,
    studentId: row.student_id || null,
    studentName: student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : null,
    gradeLevel: student?.grade_level || null,
    section: student?.section || null,
    parentName,
    parentEmail: parent?.email || null,
    incidentType: row.type,
    description: row.description || null,
    severity: null,
    symptoms: [],
    heatIndex: row.heat_index_at_time || null,
    temperature: null,
    timestamp: row.created_at || null,
    actionTaken: row.action_taken || null,
    reportedBy: reporterName || row.reporter_id || null,
    status: row.status || null,
  };
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

      // Read from the canonical `incidents` table and enrich with student info
      const { data: incidents, error: incidentsError, count } = await supabase
        .from('incidents')
        .select('id, school_id, reporter_id, student_id, type, description, action_taken, heat_index_at_time, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (incidentsError || !incidents) {
        res.status(200).json({
          success: true,
          data: [],
          pagination: { limit, offset, total: 0 },
          message: 'No incident data available',
        });
        return;
      }

      // Collect student and reporter IDs and fetch related records
      const studentIds = Array.from(new Set(incidents.map((it: any) => it.student_id).filter(Boolean)));
      const reporterIds = Array.from(new Set(incidents.map((it: any) => it.reporter_id).filter(Boolean)));
      let studentsById: Record<string, any> = {};
      let reportersById: Record<string, any> = {};
      let parentsById: Record<string, any> = {};

      if (studentIds.length > 0) {
        const { data: studs } = await supabase.from('students').select('id, first_name, last_name, grade_level, section, parent_user_id').in('id', studentIds);
        (studs || []).forEach((u: any) => {
          studentsById[u.id] = u;
        });
      }

      const parentIds = Array.from(
        new Set(Object.values(studentsById).map((student: any) => student?.parent_user_id).filter(Boolean))
      );

      if (parentIds.length > 0) {
        const { data: parents } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', parentIds);
        (parents || []).forEach((u: any) => {
          parentsById[u.id] = u;
        });
      }

      if (reporterIds.length > 0) {
        const { data: reporters } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', reporterIds);
        (reporters || []).forEach((u: any) => {
          reportersById[u.id] = u;
        });
      }

      let mapped = (incidents || []).map((row: any) => mapIncidentRow(row, studentsById, reportersById, parentsById));
      // If there are no incidents in the canonical `incidents` table, attempt to read from legacy `health_incidents` view
      if ((mapped || []).length === 0) {
        const { data: legacyData, error: legacyError, count: legacyCount } = await supabase
          .from('health_incidents')
          .select('id, student_name, grade_level, section, incident_type, severity, symptoms, heat_index, temperature, timestamp, action_taken, reported_by, status', { count: 'exact' })
          .order('timestamp', { ascending: false })
          .range(offset, offset + limit - 1);

          if (!legacyError && legacyData) {
          mapped = (legacyData || []).map((row: any) => ({
            id: row.id,
            studentId: null,
            studentName: row.student_name,
            gradeLevel: row.grade_level,
            section: row.section,
            incidentType: row.incident_type,
            description: row.description || null,
            severity: row.severity,
            symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
            heatIndex: row.heat_index,
            temperature: row.temperature,
            timestamp: row.timestamp,
            actionTaken: row.action_taken,
            reportedBy: row.reported_by,
            status: row.status,
            schoolId: row.school_id || null,
            reporterId: row.reporter_id || null,
            reporterName: row.reported_by || null,
            reporterRole: row.reporter_role || null,
            parentName: row.parent_name || null,
            parentEmail: row.parent_email || null,
          }));

          res.status(200).json({
            success: true,
            data: mapped,
            pagination: { limit, offset, total: legacyCount || 0 },
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        data: mapped,
        pagination: { limit, offset, total: count || 0 },
      });
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schoolId, reporterId, studentId, type, description, actionTaken, heatIndex } = req.body;
      if (!type || !description) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        const record = { id: `local-${Date.now()}`, schoolId, reporterId, studentId, type, description, actionTaken, heatIndex, status: 'pending', created_at: new Date().toISOString() };
        await appendFile(LOCAL_LOG, JSON.stringify(record) + '\n');
        res.status(201).json({ success: true, data: record });
        return;
      }

      const payload: any = {
        school_id: schoolId || null,
        reporter_id: reporterId || null,
        student_id: studentId || null,
        type,
        description,
        action_taken: actionTaken || null,
        heat_index_at_time: heatIndex || null,
        status: 'pending',
      };

      const { data, error } = await supabase.from('incidents').insert([payload]).select('*').single();
      if (error) {
        res.status(500).json({ success: false, message: 'Failed to create incident', error: error.message });
        return;
      }

      res.status(201).json({ success: true, data });
      return;
    } catch (err) {
      next(err);
      return;
    }
  },
  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdminClient();

      if (!supabase) {
        const local = await loadLocalIncidents();
        const record = local.find((item: any) => String(item.id) === String(id));
        if (!record) {
          res.status(404).json({ success: false, message: 'Incident not found' });
          return;
        }

        res.status(200).json({ success: true, data: record });
        return;
      }

      const { data, error } = await supabase
        .from('incidents')
        .select('id, school_id, reporter_id, student_id, type, description, action_taken, heat_index_at_time, status, created_at')
        .eq('id', id)
        .single();

      if (error || !data) {
        res.status(404).json({ success: false, message: 'Incident not found' });
        return;
      }

      const studentIds = data.student_id ? [data.student_id] : [];
      const reporterIds = data.reporter_id ? [data.reporter_id] : [];
      const studentsById: Record<string, any> = {};
      const reportersById: Record<string, any> = {};
      const parentsById: Record<string, any> = {};

      if (studentIds.length > 0) {
        const { data: studs } = await supabase.from('students').select('id, first_name, last_name, grade_level, section, parent_user_id').in('id', studentIds);
        (studs || []).forEach((student: any) => {
          studentsById[student.id] = student;
        });
      }

      const parentIds = Array.from(
        new Set(Object.values(studentsById).map((student: any) => student?.parent_user_id).filter(Boolean))
      );

      if (parentIds.length > 0) {
        const { data: parents } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', parentIds);
        (parents || []).forEach((parent: any) => {
          parentsById[parent.id] = parent;
        });
      }

      if (reporterIds.length > 0) {
        const { data: reporters } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', reporterIds);
        (reporters || []).forEach((reporter: any) => {
          reportersById[reporter.id] = reporter;
        });
      }

      res.status(200).json({ success: true, data: mapIncidentRow(data, studentsById, reportersById, parentsById) });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { schoolId, reporterId, studentId, type, description, actionTaken, heatIndex, status } = req.body;
      const updates: Record<string, unknown> = {};

      if (typeof schoolId === 'string') updates.school_id = schoolId || null;
      if (typeof reporterId === 'string') updates.reporter_id = reporterId || null;
      if (typeof studentId === 'string') updates.student_id = studentId || null;
      if (typeof type === 'string' && type.trim()) updates.type = type.trim();
      if (typeof description === 'string' && description.trim()) updates.description = description.trim();
      if (typeof actionTaken === 'string') updates.action_taken = actionTaken.trim();
      if (typeof heatIndex !== 'undefined') {
        const parsedHeatIndex = heatIndex === null || heatIndex === '' ? null : Number(heatIndex);
        updates.heat_index_at_time = Number.isFinite(parsedHeatIndex as number) ? parsedHeatIndex : null;
      }
      if (typeof status === 'string' && status.trim()) updates.status = status.trim();

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, message: 'No incident fields provided to update' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        const local = await loadLocalIncidents();
        const index = local.findIndex((item: any) => String(item.id) === String(id));
        if (index === -1) {
          res.status(404).json({ success: false, message: 'Incident not found' });
          return;
        }

        local[index] = { ...local[index], ...updates, updated_at: new Date().toISOString() };
        await saveLocalIncidents(local);
        res.status(200).json({ success: true, data: local[index] });
        return;
      }

      const { data, error } = await supabase.from('incidents').update(updates).eq('id', id).select('*').single();
      if (error || !data) {
        res.status(500).json({ success: false, message: 'Failed to update incident', error: error?.message || 'Unknown error' });
        return;
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdminClient();

      if (!supabase) {
        const local = await loadLocalIncidents();
        const nextRecords = local.filter((item: any) => String(item.id) !== String(id));
        if (nextRecords.length === local.length) {
          res.status(404).json({ success: false, message: 'Incident not found' });
          return;
        }

        await saveLocalIncidents(nextRecords);
        res.status(200).json({ success: true, message: 'Incident deleted' });
        return;
      }

      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) {
        res.status(500).json({ success: false, message: 'Failed to delete incident', error: error.message });
        return;
      }

      res.status(200).json({ success: true, message: 'Incident deleted' });
    } catch (error) {
      next(error);
    }
  },
};

export default incidentsController;
