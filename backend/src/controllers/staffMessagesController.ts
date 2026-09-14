import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

export const staffMessagesController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      const peerId = typeof req.query.peerId === 'string' ? req.query.peerId : undefined;

      if (!userId) {
        res.status(400).json({ success: false, message: 'userId is required' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      let query = supabase
        .from('staff_messages')
        .select('id, sender_id, recipient_id, subject, body, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (peerId) {
        query = query.or(
          `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`
        );
      } else {
        query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('Supabase fetch staff_messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch staff messages', error: error.message });
        return;
      }

      res.status(200).json({ success: true, data: data || [], pagination: { limit, offset, total: count || 0 } });
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { senderId, recipientId, subject, body } = req.body;
      if (!senderId || !recipientId || !subject || !body) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        res.status(201).json({
          success: true,
          data: { id: `local-${Date.now()}`, sender_id: senderId, recipient_id: recipientId, subject, body, created_at: new Date().toISOString() },
        });
        return;
      }

      const { data, error } = await supabase
        .from('staff_messages')
        .insert([{ sender_id: senderId, recipient_id: recipientId, subject, body }])
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ success: false, message: 'Failed to save staff message', error: error.message });
        return;
      }

      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};

export default staffMessagesController;
