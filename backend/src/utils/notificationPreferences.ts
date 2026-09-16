// Different Profile/Settings pages historically saved their notification
// toggles under different key names (emailNotifications, notifyEmail,
// receiveEmails, emailAlerts, ...) — check every alias instead of forcing
// a data migration. Undefined (never configured) defaults to opted-in for
// email and opted-out for SMS, matching each page's own initial state.
const EMAIL_PREFERENCE_KEYS = ['emailNotifications', 'notifyEmail', 'receiveEmails', 'emailAlerts'];
const SMS_PREFERENCE_KEYS = ['smsNotifications', 'notifySms', 'receiveSms', 'smsAlerts'];

export const prefersNotificationChannel = (
  metadata: Record<string, unknown> | null | undefined,
  channel: 'email' | 'sms'
): boolean => {
  const prefs = metadata?.notificationPreferences as Record<string, unknown> | undefined;
  if (!prefs || typeof prefs !== 'object') {
    return channel === 'email';
  }

  const keys = channel === 'email' ? EMAIL_PREFERENCE_KEYS : SMS_PREFERENCE_KEYS;
  for (const key of keys) {
    if (typeof prefs[key] === 'boolean') {
      return prefs[key] as boolean;
    }
  }

  return channel === 'email';
};

// Alert-type toggles (Heat Index / Health Advisory / System) from the
// Settings page. Each defaults to opted-in when the user has never saved
// preferences yet, matching the Settings page's own default state.
const ALERT_TYPE_KEYS = {
  heat: 'heatAlerts',
  advisory: 'advisoryAlerts',
  system: 'systemNotifications',
} as const;

export const prefersAlertType = (
  metadata: Record<string, unknown> | null | undefined,
  alertType: 'heat' | 'advisory' | 'system'
): boolean => {
  const prefs = metadata?.notificationPreferences as Record<string, unknown> | undefined;
  if (!prefs || typeof prefs !== 'object') {
    return true;
  }

  const key = ALERT_TYPE_KEYS[alertType];
  const value = prefs[key];
  return typeof value === 'boolean' ? value : true;
};
