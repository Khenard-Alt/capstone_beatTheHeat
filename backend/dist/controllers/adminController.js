"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentQuestionInsights = exports.getAdminStats = void 0;
const supabase_1 = require("../config/supabase");
const fallbackStats = (period) => {
    const now = new Date();
    const points = period === 'today' ? 6 : period === 'week' ? 7 : 8;
    return {
        success: true,
        message: 'Serving fallback admin stats (database not configured)',
        stats: {
            activeAdvisories: 0,
            incidents: 0,
            activeUsers: 1,
            trend: Array.from({ length: points }).map((_, idx) => ({
                timestamp: new Date(now.getTime() - (points - 1 - idx) * 60 * 60 * 1000).toISOString(),
                count: 0,
            })),
        },
    };
};
const getAdminStats = async (req, res, next) => {
    try {
        const period = req.query.period || 'today';
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            res.status(200).json(fallbackStats(period));
            return;
        }
        let startDate;
        const now = new Date();
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        else if (period === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        else {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        // Fetch advisory/analysis logs count
        const { count: advisoryCount, error: _advisoryError } = await client
            .from('ai_analysis_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());
        // Fetch canonical heat incidents from the incidents table.
        // This dashboard metric should reflect actual incident records, not raw heat snapshots.
        const { count: incidentCount, error: _incidentError } = await client
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());
        // Fetch trend data (advisories per hour for today or per day for week/month)
        let trendData = [];
        if (period === 'today') {
            const { data: hourlyData, error: trendError } = await client
                .from('ai_analysis_logs')
                .select('created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });
            if (!trendError && hourlyData) {
                const hourlyMap = new Map();
                hourlyData.forEach((log) => {
                    const date = new Date(log.created_at);
                    const hourKey = date.toISOString().slice(0, 13) + ':00:00';
                    hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1);
                });
                trendData = Array.from(hourlyMap.entries()).map(([time, count]) => ({
                    timestamp: time,
                    count,
                }));
            }
        }
        else {
            const { data: dailyData, error: trendError } = await client
                .from('ai_analysis_logs')
                .select('created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });
            if (!trendError && dailyData) {
                const dailyMap = new Map();
                dailyData.forEach((log) => {
                    const date = new Date(log.created_at);
                    const dayKey = date.toISOString().slice(0, 10);
                    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
                });
                trendData = Array.from(dailyMap.entries()).map(([date, count]) => ({
                    timestamp: date,
                    count,
                }));
            }
        }
        res.status(200).json({
            success: true,
            stats: {
                activeAdvisories: advisoryCount || 0,
                incidents: incidentCount || 0,
                activeUsers: 1, // Placeholder - would need user table
                trend: trendData,
            },
            metadata: {
                period,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminStats = getAdminStats;
const getParentQuestionInsights = async (req, res, next) => {
    try {
        const period = req.query.period || 'week';
        const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            res.status(200).json({
                success: true,
                message: 'Serving fallback parent question insights (database not configured)',
                data: [],
                metadata: { period, limit, totalUniqueQuestions: 0 },
            });
            return;
        }
        let startDate;
        const now = new Date();
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        else if (period === 'month') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        else {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        const { data, error } = await client
            .from('ai_analysis_logs')
            .select('request_query, created_at, source, model')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch parent question insights',
                error: error.message,
            });
            return;
        }
        const skipQueries = [
            'Provide current school heat safety advisory based on the given weather.',
            'Out-of-scope request detected. Redirect to heat index safety guidance only.',
        ];
        const map = new Map();
        for (const row of data || []) {
            const raw = String(row.request_query ?? '').trim();
            if (!raw || raw.length < 6) {
                continue;
            }
            if (skipQueries.includes(raw)) {
                continue;
            }
            const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
            const existing = map.get(normalized);
            if (!existing) {
                map.set(normalized, {
                    question: raw,
                    count: 1,
                    lastAskedAt: String(row.created_at ?? now.toISOString()),
                    lastSource: String(row.source ?? 'unknown'),
                    lastModel: String(row.model ?? 'unknown'),
                });
                continue;
            }
            existing.count += 1;
            const rowDate = new Date(String(row.created_at ?? now.toISOString())).getTime();
            const currentDate = new Date(existing.lastAskedAt).getTime();
            if (rowDate > currentDate) {
                existing.lastAskedAt = String(row.created_at ?? existing.lastAskedAt);
                existing.lastSource = String(row.source ?? existing.lastSource);
                existing.lastModel = String(row.model ?? existing.lastModel);
            }
        }
        const insights = Array.from(map.values())
            .sort((a, b) => (b.count === a.count
            ? new Date(b.lastAskedAt).getTime() - new Date(a.lastAskedAt).getTime()
            : b.count - a.count))
            .slice(0, limit);
        res.status(200).json({
            success: true,
            data: insights,
            metadata: {
                period,
                limit,
                totalUniqueQuestions: map.size,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getParentQuestionInsights = getParentQuestionInsights;
//# sourceMappingURL=adminController.js.map