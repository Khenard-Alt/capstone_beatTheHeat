"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const email_service_1 = require("../services/email.service");
const supabase_1 = require("../config/supabase");
exports.notificationController = {
    /**
     * Send heat alert email to users
     */
    sendHeatAlert: async (req, res, next) => {
        try {
            const { userId, heatLevel, heatIndex, recommendations, schoolName } = req.body;
            if (!userId || !heatLevel || heatIndex === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: userId, heatLevel, heatIndex',
                });
                return;
            }
            // Get user email from Supabase
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                res.status(503).json({ success: false, message: 'Database not available (fallback mode)' });
                return;
            }
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('email, first_name')
                .eq('id', userId)
                .single();
            if (userError || !user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            // Send email
            const emailSent = await (0, email_service_1.sendHeatAlertEmail)(user.email, user.first_name || 'User', schoolName || 'Your School', heatLevel, heatIndex, recommendations || []);
            if (!emailSent) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to send heat alert email',
                });
                return;
            }
            res.json({
                success: true,
                message: 'Heat alert email sent successfully',
                data: { userId, email: user.email },
            });
            return;
        }
        catch (error) {
            next(error);
            return;
        }
    },
    /**
     * Send health advisory notification email
     */
    sendAdvisoryNotification: async (req, res, next) => {
        try {
            const { userIds, advisoryTitle, advisoryText, riskLevel, schoolName } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'userIds must be a non-empty array',
                });
                return;
            }
            if (!advisoryTitle || !advisoryText) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: advisoryTitle, advisoryText',
                });
                return;
            }
            // Get user emails from Supabase
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                res.status(503).json({ success: false, message: 'Database not available (fallback mode)' });
                return;
            }
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, email, first_name')
                .in('id', userIds);
            if (usersError || !users || users.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'No users found',
                });
                return;
            }
            // Send emails to all users
            const results = await Promise.all(users.map((user) => (0, email_service_1.sendAdvisoryNotificationEmail)(user.email, user.first_name || 'User', schoolName || 'Your School', advisoryTitle, advisoryText, riskLevel || 'medium')));
            const successCount = results.filter((r) => r).length;
            res.json({
                success: true,
                message: `Advisory notification sent to ${successCount} of ${users.length} users`,
                data: {
                    totalUsers: users.length,
                    successCount,
                    failedCount: users.length - successCount,
                },
            });
            return;
        }
        catch (error) {
            next(error);
            return;
        }
    },
    /**
     * Broadcast heat alert to all users in a school
     */
    broadcastHeatAlert: async (req, res, next) => {
        try {
            const { schoolId, heatLevel, heatIndex, recommendations } = req.body;
            if (!schoolId || !heatLevel || heatIndex === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: schoolId, heatLevel, heatIndex',
                });
                return;
            }
            // Get all users for the school
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                res.status(503).json({ success: false, message: 'Database not available (fallback mode)' });
                return;
            }
            const { data: school } = await supabase
                .from('schools')
                .select('name')
                .eq('id', schoolId)
                .single();
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, email, first_name')
                .eq('school_id', schoolId);
            if (usersError || !users || users.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'No users found for this school',
                });
                return;
            }
            // Send heat alert emails to all users
            const results = await Promise.all(users.map((user) => (0, email_service_1.sendHeatAlertEmail)(user.email, user.first_name || 'User', school?.name || 'Your School', heatLevel, heatIndex, recommendations || [])));
            const successCount = results.filter((r) => r).length;
            res.json({
                success: true,
                message: `Heat alert broadcast to ${successCount} of ${users.length} users`,
                data: {
                    schoolId,
                    totalUsers: users.length,
                    successCount,
                    failedCount: users.length - successCount,
                },
            });
            return;
        }
        catch (error) {
            next(error);
            return;
        }
    },
};
//# sourceMappingURL=notificationController.js.map