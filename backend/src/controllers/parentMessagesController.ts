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
      const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;
      const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        // Read local file quickly by returning empty or sample
        res.status(200).json({ success: true, data: [] });
        return;
      }

      let query = supabase
        .from('parent_messages')
        .select('id, parent_id, teacher_id, sender_role, subject, body, status, reply, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (parentId) {
        query = query.eq('parent_id', parentId);
      }

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);

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
      const {
        parentUserId,
        teacherUserId,
        subject,
        body,
        senderRole,
      } = req.body;
      if (!parentUserId || !teacherUserId || !subject || !body) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const normalizedSenderRole = senderRole === 'teacher' ? 'teacher' : 'parent';

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        const record = {
          id: `local-${Date.now()}`,
          parentUserId,
          teacherUserId,
          senderRole: normalizedSenderRole,
          subject,
          body,
          created_at: new Date().toISOString(),
        };
        await appendFile(LOCAL_LOG, JSON.stringify(record) + '\n');
        res.status(201).json({ success: true, data: record });
        return;
      }

      const { data, error } = await supabase
        .from('parent_messages')
        .insert([{ parent_id: parentUserId, teacher_id: teacherUserId, sender_role: normalizedSenderRole, subject, body }])
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
