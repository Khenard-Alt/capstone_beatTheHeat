import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';
import { sendEmail } from '../services/email.service';

const fetchParentEmails = async (supabase: any, schoolId?: string): Promise<string[]> => {
  if (!supabase) return [];
  let q = supabase.from('users').select('email').eq('role', 'parent');
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r: any) => r.email).filter(Boolean);
};

export const notificationsController = {
  sendAdvisoryEmails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schoolId, advisory } = req.body;
      if (!advisory) {
        res.status(400).json({ success: false, message: 'Missing advisory payload' });
        return;
      }

      const supabase = getSupabaseAdminClient();
      const parents = supabase ? await fetchParentEmails(supabase, schoolId) : [];

      if (parents.length === 0) {
        res.status(200).json({ success: true, message: 'No parent emails found to notify' });
        return;
      }

      const subject = `Health Advisory: ${advisory.title || 'Important Update'}`;
      const html = `<p>${advisory.advisoryText || ''}</p><p>Recommendations: ${JSON.stringify(advisory.recommendations || [])}</p>`;

      await sendEmail(parents, subject, html);
      res.status(200).json({ success: true, notified: parents.length });
      return;
    } catch (err) {
      next(err);
      return;
    }
  },
};

export default notificationsController;
