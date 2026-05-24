import { Request, Response, NextFunction } from 'express';
import { appendFile } from 'fs/promises';
import path from 'path';
import { getSupabaseAdminClient } from '../config/supabase';

const LOCAL_LOG = path.resolve(process.cwd(), 'logs', 'parent-messages.jsonl');

export const parentMessagesController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        // Read local file quickly by returning empty or sample
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const { data, error, count } = await supabase
        .from('parent_messages')
        .select('id, parent_user_id, teacher_user_id, student_id, subject, body, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        // Log the Supabase error server-side for diagnosis
        // eslint-disable-next-line no-console
        console.error('Supabase fetch parent_messages error:', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
        return;
      }

      res.status(200).json({ success: true, data: data || [], pagination: { limit, offset, total: count || 0 } });
      return;
    } catch (err) {
      next(err);
      return;
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { parentUserId, teacherUserId, studentId, subject, body } = req.body;
      if (!parentUserId || !teacherUserId || !subject || !body) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        const record = { id: `local-${Date.now()}`, parentUserId, teacherUserId, studentId, subject, body, created_at: new Date().toISOString() };
        await appendFile(LOCAL_LOG, JSON.stringify(record) + '\n');
        res.status(201).json({ success: true, data: record });
        return;
      }

      const { data, error } = await supabase
        .from('parent_messages')
        .insert([{ parent_user_id: parentUserId, teacher_user_id: teacherUserId, student_id: studentId || null, subject, body }])
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ success: false, message: 'Failed to save message', error: error.message });
        return;
      }

      res.status(201).json({ success: true, data });
      return;
    } catch (err) {
        next(err);
        return;
      }
  },
};

export default parentMessagesController;
