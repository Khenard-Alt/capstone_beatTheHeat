"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const supabase_1 = require("../config/supabase");
const environment_1 = require("../config/environment");
const email_service_1 = require("./email.service");
const sms_service_1 = require("./sms.service");
const aiAnalysis_service_1 = require("./aiAnalysis.service");
const notificationFormatting_1 = require("../utils/notificationFormatting");
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
            .in('role', ['parent', 'principal', 'teacher']);
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
        const titleText = (0, notificationFormatting_1.formatScheduledNotificationTitle)(title);
        const rows = recipients.map((recipient) => ({
            user_id: recipient.id,
            type: 'heat-alert',
            title: titleText,
            message,
            status: 'unread',
            priority,
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
        // If heat reaches the highest severity, also generate and send an AI advisory
        if (snapshot.heatLevel === 'extreme-danger') {
            try {
                await this.dispatchAdvisoryForSnapshot(snapshot);
            }
            catch (err) {
                console.error('[NOTIFY] Failed to dispatch advisory for extreme heat:', err);
            }
        }
    }
    async dispatchAdvisoryForSnapshot(snapshot) {
        // generate advisory via AI service
        const advisoryQuery = 'Realtime health advisory update for current heat index.';
        let advisoryResult;
        try {
            advisoryResult = await aiAnalysis_service_1.aiAnalysisService.generateScopedAdvisory({ query: advisoryQuery, weather: snapshot, single: true });
        }
        catch (err) {
            console.error('[NOTIFY] AI advisory generation failed:', err);
            return;
        }
        const recipients = await this.fetchRecipients('school-1');
        if (recipients.length === 0)
            return;
        const title = `Health Advisory: ${advisoryResult.riskLevel?.toUpperCase() || 'Advisory'}`;
        const message = advisoryResult.singleResponse ?? advisoryResult.summary ?? 'Please follow school guidance.';
        const priority = snapshot.heatLevel === 'extreme-danger' ? 'high' : 'medium';
        await this.saveInAppNotifications(recipients, title, message, priority);
        if (environment_1.env.heatAlertEmailEnabled) {
            await Promise.all(recipients
                .filter((r) => !!r.email)
                .map((r) => (0, email_service_1.sendAdvisoryNotificationEmail)(String(r.email), r.first_name ?? r.last_name ?? 'User', snapshot.location, title, message, priority === 'high' ? 'high' : 'medium')));
        }
    }
}
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map