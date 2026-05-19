import { Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { getSupabaseAdminClient } from '../config/supabase';

const loadLocalAnnouncements = async (): Promise<any[]> => {
  const sample = [
    {
      id: 'local-1',
      title: 'Heat monitoring active',
      body: 'School is monitoring heat index. Encourage hydration and light clothing today.',
      created_at: new Date().toISOString(),
      priority: 'info',
    },
  ];

  // Try reading an announcements log if present (non-fatal)
  try {
    const p = path.resolve(process.cwd(), 'logs', 'announcements.jsonl');
    const raw = await readFile(p, 'utf-8');
    const rows = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (rows.length > 0) return rows as any[];
  } catch {
    // ignore
  }

  return sample;
};

export const announcementsController = {
  getAnnouncements: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
          const local = await loadLocalAnnouncements();
          res.status(200).json({ success: true, data: local.slice(offset, offset + limit) });
          return;
      }

      const { data, error, count } = await supabase
        .from('announcements')
        .select('id, title, body, priority, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
          res.status(500).json({ success: false, message: 'Failed to fetch announcements', error: error.message });
          return;
      }

      res.status(200).json({ success: true, data: data || [], pagination: { limit, offset, total: count || 0 } });
    } catch (error) {
      next(error);
      return;
    }
  },
};

export default announcementsController;
