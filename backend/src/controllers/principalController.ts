import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

const buildFallbackStats = (period: string) => {
  const now = new Date();
  const points = period === 'today' ? 6 : period === 'week' ? 7 : 8;

  return {
    activeAdvisories: 0,
    incidents: 0,
    activeUsers: 1,
    trend: Array.from({ length: points }).map((_, idx) => ({
      timestamp: new Date(now.getTime() - (points - 1 - idx) * 60 * 60 * 1000).toISOString(),
      count: 0,
    })),
  };
};

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

export const getPrincipalStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'today';
    const client = getSupabaseAdminClient();

    if (!client) {
      res.status(200).json({
        success: true,
        stats: buildFallbackStats(period),
        metadata: { period },
      });
      return;
    }

    let startDate: Date;
    const now = new Date();

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [{ count: advisoryCount }, { count: incidentCount }, { count: legacyIncidentCount }] = await Promise.all([
      client.from('ai_analysis_logs').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      client.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      client.from('health_incidents').select('*', { count: 'exact', head: true }).gte('timestamp', startDate.toISOString()),
    ]);

    const { count: activeUsersCount } = await client.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true);

    let trend: Array<{ timestamp: string; count: number }> = [];
    if (period === 'today') {
      const { data } = await client.from('ai_analysis_logs').select('created_at').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true });
      const hourlyMap = new Map<string, number>();
      (data || []).forEach((log: any) => {
        const date = new Date(log.created_at);
        const hourKey = date.toISOString().slice(0, 13) + ':00:00';
        hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1);
      });
      trend = Array.from(hourlyMap.entries()).map(([timestamp, count]) => ({ timestamp, count }));
    } else {
      const { data } = await client.from('ai_analysis_logs').select('created_at').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true });
      const dailyMap = new Map<string, number>();
      (data || []).forEach((log: any) => {
        const date = new Date(log.created_at);
        const dayKey = date.toISOString().slice(0, 10);
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
      });
      trend = Array.from(dailyMap.entries()).map(([timestamp, count]) => ({ timestamp, count }));
    }

    res.status(200).json({
      success: true,
      stats: {
        activeAdvisories: advisoryCount || 0,
        incidents: incidentCount || legacyIncidentCount || 0,
        activeUsers: activeUsersCount || 0,
        trend,
      },
      metadata: { period, startDate: startDate.toISOString(), endDate: now.toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

export const getIncidentTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'week';
    const client = getSupabaseAdminClient();

    if (!client) {
      const now = new Date();
      const points = period === 'today' ? 6 : period === 'week' ? 7 : 8;
      res.status(200).json({
        success: true,
        data: Array.from({ length: points }).map((_, idx) => ({
          timestamp: new Date(now.getTime() - (points - 1 - idx) * 24 * 60 * 60 * 1000).toISOString(),
          count: 0,
        })),
        metadata: { period },
      });
      return;
    }

    let startDate: Date;
    const now = new Date();

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data, error } = await client
      .from('incidents')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch incident trends', error: error.message });
      return;
    }

    const map = new Map<string, number>();
    for (const row of data || []) {
      const date = new Date((row as any).created_at);
      const key = period === 'today' ? date.toISOString().slice(0, 13) + ':00:00' : date.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    }

    res.status(200).json({
      success: true,
      data: Array.from(map.entries()).map(([timestamp, count]) => ({ timestamp, count })),
      metadata: { period, startDate: startDate.toISOString(), endDate: now.toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPendingApprovals,
  getSchoolReports,
  getPrincipalStats,
  getIncidentTrends,
};
