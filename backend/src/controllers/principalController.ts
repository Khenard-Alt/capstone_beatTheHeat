import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

export const getPendingApprovals = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const client = getSupabaseAdminClient();
    if (!client) {
      // Fallback mock approvals
      res.status(200).json({
        success: true,
        data: [
          { id: 'a1', type: 'announcement', title: 'Field trip postponement', submittedBy: 'Teacher A', submittedAt: new Date().toISOString() },
        ],
      });
      return;
    }

    // Example: fetch pending approvals from a hypothetical `approvals` table
    const { data, error } = await client.from('approvals').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50);
    if (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch approvals', error: error.message });
      return;
    }

    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

export const getSchoolReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'month';
    const client = getSupabaseAdminClient();
    if (!client) {
      // Fallback mock reports
      res.status(200).json({
        success: true,
        data: [
          { id: 'r1', title: 'Monthly Heat Incidents', summary: '0 incidents this month', date: new Date().toISOString() },
        ],
        metadata: { period },
      });
      return;
    }

    // Example: aggregation from `heat_index_logs`
    const { data, error } = await client.from('heat_index_logs').select('date, heat_index_c').limit(500);
    if (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch reports', error: error.message });
      return;
    }

    res.status(200).json({ success: true, data: data || [], metadata: { period } });
  } catch (error) {
    next(error);
  }
};

export default {
  getPendingApprovals,
  getSchoolReports,
};
