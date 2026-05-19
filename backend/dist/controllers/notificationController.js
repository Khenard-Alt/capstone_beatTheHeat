"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const email_service_1 = require("../services/email.service");
const supabase_1 = require("../config/supabase");
const toPriority = (level) => {
    const normalized = String(level ?? '').toLowerCase();
    if (['danger', 'extreme-danger', 'critical', 'high'].includes(normalized)) {
        return 'high';
    }
    if (['caution', 'extreme-caution', 'medium'].includes(normalized)) {
        return 'medium';
    }
    return 'low';
};
const insertNotifications = async (userIds, payload) => {
    const supabase = (0, supabase_1.getSupabaseAdminClient)();
    if (!supabase) {
        return;
    }
    const now = new Date().toISOString();
    const rows = userIds.map((userId) => ({
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        status: 'unread',
        priority: payload.priority,
        sent_at: now,
        created_at: now,
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
        console.error('Failed to insert notifications:', error.message);
    }
};
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
            await insertNotifications([userId], {
                type: 'heat-alert',
                title: `Heat Alert: ${String(heatLevel).toUpperCase()}`,
                message: `Current heat index is ${heatIndex}°C. Please follow the recommended safety measures.`,
                priority: toPriority(heatLevel),
            });
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
            await insertNotifications(users.map((user) => user.id), {
                type: 'advisory',
                title: advisoryTitle,
                message: advisoryText,
                priority: toPriority(riskLevel),
            });
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
            await insertNotifications(users.map((user) => user.id), {
                type: 'heat-alert',
                title: `Heat Alert: ${String(heatLevel).toUpperCase()}`,
                message: `Current heat index is ${heatIndex}°C. Please follow the recommended safety measures.`,
                priority: toPriority(heatLevel),
            });
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
    /**
     * Get notifications for a user
     */
    getNotifications: async (req, res, next) => {
        try {
            const userId = String(req.query.userId ?? '').trim();
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            if (!userId) {
                res.status(400).json({ success: false, message: 'userId is required' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                res.status(200).json({ success: true, data: [] });
                return;
            }
            const { data, error } = await supabase
                .from('notifications')
                .select('id, user_id, type, title, message, status, priority, sent_at, read_at')
                .eq('user_id', userId)
                .order('sent_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
                return;
            }
            res.status(200).json({
                success: true,
                data: (data || []).map((row) => ({
                    id: row.id,
                    userId: row.user_id,
                    type: row.type,
                    title: row.title,
                    message: row.message,
                    status: row.status,
                    priority: row.priority,
                    sentAt: row.sent_at,
                    readAt: row.read_at ?? undefined,
                })),
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Mark notification as read
     */
    markAsRead: async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'Notification id is required' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                res.status(200).json({ success: true });
                return;
            }
            const { error } = await supabase
                .from('notifications')
                .update({ status: 'read', read_at: new Date().toISOString() })
                .eq('id', id);
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to update notification', error: error.message });
                return;
            }
            res.status(200).json({ success: true });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Clear notifications for a user
     */
    clearAll: async (req, res, next) => {
        try {
            const userId = String(req.query.userId ?? '').trim();
            if (!userId) {
                res.status(400).json({ success: false, message: 'userId is required' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                res.status(200).json({ success: true });
                return;
            }
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', userId);
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to clear notifications', error: error.message });
                return;
            }
            res.status(200).json({ success: true });
        }
        catch (error) {
            next(error);
        }
    },
};
//# sourceMappingURL=notificationController.js.map