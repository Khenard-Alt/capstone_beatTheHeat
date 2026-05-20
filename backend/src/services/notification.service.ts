import { getSupabaseAdminClient } from '../config/supabase';
import { env } from '../config/environment';
import { WeatherSnapshot } from '../types';
import { sendHeatAlertEmail } from './email.service';
import { sendHeatAlertSms } from './sms.service';

interface AlertRecipient {
	id: string;
	email: string | null;
	first_name: string | null;
	last_name: string | null;
	phone: string | null;
	role: string;
	school_id: string;
}

class NotificationService {
	private readonly lastDispatchBySchool = new Map<string, number>();

	private shouldNotifyForLevel(level: string): boolean {
		return env.heatAlertNotifyLevels.includes(level.toLowerCase());
	}

	private isWithinCooldown(schoolId: string): boolean {
		const cooldownMinutes = Math.max(1, env.heatAlertCooldownMinutes);
		const lastSentAt = this.lastDispatchBySchool.get(schoolId);
		if (!lastSentAt) {
			return false;
		}
		const elapsedMs = Date.now() - lastSentAt;
		return elapsedMs < cooldownMinutes * 60 * 1000;
	}

	private async fetchRecipients(schoolId: string): Promise<AlertRecipient[]> {
		const client = getSupabaseAdminClient();
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

		return data as AlertRecipient[];
	}

	private async saveInAppNotifications(
		recipients: AlertRecipient[],
		title: string,
		message: string,
		priority: 'low' | 'medium' | 'high'
	): Promise<void> {
		const client = getSupabaseAdminClient();
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

	public async dispatchHeatAlerts(snapshot: WeatherSnapshot): Promise<void> {
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
		const priority: 'high' = 'high';

		await this.saveInAppNotifications(recipients, title, message, priority);

		if (env.heatAlertEmailEnabled) {
			await Promise.all(
				recipients
					.filter((recipient) => !!recipient.email)
					.map((recipient) =>
						sendHeatAlertEmail(
							String(recipient.email),
							recipient.first_name ?? recipient.last_name ?? 'User',
							snapshot.location,
							snapshot.heatLevel,
							snapshot.heatIndexC,
							[
								'Reduce outdoor activity and prioritize hydration breaks.',
								'Monitor students for signs of heat stress and escalate early.',
							]
						)
					)
			);
		}

		if (env.heatAlertSmsEnabled) {
			await Promise.all(
				recipients
					.filter((recipient) => !!recipient.phone)
					.map((recipient) =>
						sendHeatAlertSms(
							String(recipient.phone),
							recipient.first_name ?? recipient.last_name ?? 'User',
							snapshot.heatLevel,
							snapshot.heatIndexC
						)
					)
			);
		}

		this.lastDispatchBySchool.set(schoolId, Date.now());
	}
}

export const notificationService = new NotificationService();
