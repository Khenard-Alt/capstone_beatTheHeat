"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const supabase_1 = require("../config/supabase");
const environment_1 = require("../config/environment");
const email_service_1 = require("./email.service");
const sms_service_1 = require("./sms.service");
class NotificationService {
    constructor() {
        this.lastDispatchBySchool = new Map();
    }
    shouldNotifyForLevel(level) {
        return environment_1.env.heatAlertNotifyLevels.includes(level.toLowerCase());
    }
    isWithinCooldown(schoolId) {
        const cooldownMinutes = Math.max(1, environment_1.env.heatAlertCooldownMinutes);
        const lastSentAt = this.lastDispatchBySchool.get(schoolId);
        if (!lastSentAt) {
            return false;
        }
        const elapsedMs = Date.now() - lastSentAt;
        return elapsedMs < cooldownMinutes * 60 * 1000;
    }
    async fetchRecipients(schoolId) {
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            return [];
        }
        const { data, error } = await client
            .from('users')
            .select('id, email, first_name, last_name, phone, role, school_id')
            .eq('school_id', schoolId)
            .in('role', ['parent', 'principal']);
        if (error || !data) {
            console.error('[NOTIFY] Failed to fetch parent/principal recipients:', error?.message ?? error);
            return [];
        }
        return data;
    }
    async saveInAppNotifications(recipients, title, message, priority) {
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client || recipients.length === 0) {
            return;
        }
        const now = new Date().toISOString();
        const rows = recipients.map((recipient) => ({
            user_id: recipient.id,
            type: 'heat-alert',
            title,
            message,
            status: 'unread',
            priority,
            sent_at: now,
            created_at: now,
        }));
        const { error } = await client.from('notifications').insert(rows);
        if (error) {
            console.error('[NOTIFY] Failed to persist in-app notifications:', error.message);
        }
    }
    async dispatchHeatAlerts(snapshot) {
        if (!this.shouldNotifyForLevel(snapshot.heatLevel)) {
            return;
        }
        const schoolId = 'school-1';
        if (this.isWithinCooldown(schoolId)) {
            return;
        }
        const recipients = await this.fetchRecipients(schoolId);
        if (recipients.length === 0) {
            return;
        }
        const title = `Heat Alert: ${snapshot.heatLevel.toUpperCase().replace('-', ' ')}`;
        const message = `Current heat index is ${snapshot.heatIndexC.toFixed(1)}°C (${snapshot.heatLevel}). Follow heat safety protocols and school advisories.`;
        const priority = 'high';
        await this.saveInAppNotifications(recipients, title, message, priority);
        if (environment_1.env.heatAlertEmailEnabled) {
            await Promise.all(recipients
                .filter((recipient) => !!recipient.email)
                .map((recipient) => (0, email_service_1.sendHeatAlertEmail)(String(recipient.email), recipient.first_name ?? recipient.last_name ?? 'User', snapshot.location, snapshot.heatLevel, snapshot.heatIndexC, [
                'Reduce outdoor activity and prioritize hydration breaks.',
                'Monitor students for signs of heat stress and escalate early.',
            ])));
        }
        if (environment_1.env.heatAlertSmsEnabled) {
            await Promise.all(recipients
                .filter((recipient) => !!recipient.phone)
                .map((recipient) => (0, sms_service_1.sendHeatAlertSms)(String(recipient.phone), recipient.first_name ?? recipient.last_name ?? 'User', snapshot.heatLevel, snapshot.heatIndexC)));
        }
        this.lastDispatchBySchool.set(schoolId, Date.now());
    }
}
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map