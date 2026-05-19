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
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: userId, heatLevel, heatIndex',
                });
            }
            // Get user email from Supabase
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('email, first_name')
                .eq('id', userId)
                .single();
            if (userError || !user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }
            // Send email
            const emailSent = await (0, email_service_1.sendHeatAlertEmail)(user.email, user.first_name || 'User', schoolName || 'Your School', heatLevel, heatIndex, recommendations || []);
            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send heat alert email',
                });
            }
            res.json({
                success: true,
                message: 'Heat alert email sent successfully',
                data: { userId, email: user.email },
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Send health advisory notification email
     */
    sendAdvisoryNotification: async (req, res, next) => {
        try {
            const { userIds, advisoryTitle, advisoryText, riskLevel, schoolName } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'userIds must be a non-empty array',
                });
            }
            if (!advisoryTitle || !advisoryText) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: advisoryTitle, advisoryText',
                });
            }
            // Get user emails from Supabase
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, email, first_name')
                .in('id', userIds);
            if (usersError || !users || users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No users found',
                });
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
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Broadcast heat alert to all users in a school
     */
    broadcastHeatAlert: async (req, res, next) => {
        try {
            const { schoolId, heatLevel, heatIndex, recommendations } = req.body;
            if (!schoolId || !heatLevel || heatIndex === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: schoolId, heatLevel, heatIndex',
                });
            }
            // Get all users for the school
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
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
                return res.status(404).json({
                    success: false,
                    message: 'No users found for this school',
                });
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
        }
        catch (error) {
            next(error);
        }
    },
};
//# sourceMappingURL=notificationController.js.map