const SCHEDULED_ADVISORY_TITLE = /^Scheduled Advisory - (\d{2}):(\d{2})$/;

export const formatScheduledNotificationTitle = (title: string): string => {
	const match = title.match(SCHEDULED_ADVISORY_TITLE);
	if (!match) {
		return title;
	}

	const hours = Number.parseInt(match[1], 10);
	const minutes = Number.parseInt(match[2], 10);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return title;
	}

	const ampm = hours >= 12 ? 'pm' : 'am';
	let normalizedHours = hours % 12;
	if (normalizedHours === 0) {
		normalizedHours = 12;
	}

	return `Scheduled Advisory - ${normalizedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};