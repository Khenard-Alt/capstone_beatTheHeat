"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchoolReports = exports.getPendingApprovals = void 0;
const supabase_1 = require("../config/supabase");
const getPendingApprovals = async (_req, res, next) => {
    try {
        const client = (0, supabase_1.getSupabaseAdminClient)();
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
    }
    catch (error) {
        next(error);
    }
};
exports.getPendingApprovals = getPendingApprovals;
const getSchoolReports = async (req, res, next) => {
    try {
        const period = req.query.period || 'month';
        const client = (0, supabase_1.getSupabaseAdminClient)();
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
    }
    catch (error) {
        next(error);
    }
};
exports.getSchoolReports = getSchoolReports;
exports.default = {
    getPendingApprovals: exports.getPendingApprovals,
    getSchoolReports: exports.getSchoolReports,
};
//# sourceMappingURL=principalController.js.map