import path from 'path';

const defaultPythonExecutable = (): string => {
	const base = path.resolve(
		process.cwd(),
		'.venv',
		process.platform === 'win32' ? 'Scripts' : 'bin',
		process.platform === 'win32' ? 'python.exe' : 'python'
	);
	return base;
};

export const env = {
	get nodeEnv(): string {
		return process.env.NODE_ENV ?? 'development';
	},
	get port(): number {
		return Number(process.env.PORT ?? 5000);
	},
	get corsOrigin(): string {
		return process.env.CORS_ORIGIN ?? 'http://localhost:5173';
	},
	get openWeatherApiKey(): string {
		return process.env.OPENWEATHER_API_KEY ?? '';
	},
	get googleGeminiApiKey(): string {
		return process.env.GOOGLE_GEMINI_API_KEY ?? '';
	},
	get schoolLat(): number {
		return Number(process.env.SCHOOL_LAT ?? 14.575);
	},
	get schoolLon(): number {
		return Number(process.env.SCHOOL_LON ?? 121.025);
	},
	get schoolLocationName(): string {
		return process.env.SCHOOL_LOCATION_NAME ?? 'Brgy Mayamot, Antipolo City';
	},
	get weatherSchedulerToken(): string {
		return process.env.WEATHER_SCHEDULER_TOKEN ?? '';
	},
	get smsProvider(): 'android-heartbeat' | 'twilio' {
		const raw = (process.env.SMS_PROVIDER ?? 'android-heartbeat').toLowerCase();
		return raw === 'twilio' ? 'twilio' : 'android-heartbeat';
	},
	get androidSmsGatewayUrl(): string {
		return process.env.ANDROID_SMS_GATEWAY_URL ?? '';
	},
	get androidSmsGatewayApiKey(): string {
		return process.env.ANDROID_SMS_GATEWAY_API_KEY ?? '';
	},
	get androidSmsGatewayUsername(): string {
		return process.env.ANDROID_SMS_GATEWAY_USERNAME ?? '';
	},
	get androidSmsGatewayPassword(): string {
		return process.env.ANDROID_SMS_GATEWAY_PASSWORD ?? '';
	},
	get androidSmsHeartbeatUrl(): string {
		return process.env.ANDROID_SMS_HEARTBEAT_URL ?? '';
	},
	get androidSmsHeartbeatTimeoutMs(): number {
		return Number(process.env.ANDROID_SMS_HEARTBEAT_TIMEOUT_MS ?? 5000);
	},
	get twilioAccountSid(): string {
		return process.env.TWILIO_ACCOUNT_SID ?? '';
	},
	get twilioAuthToken(): string {
		return process.env.TWILIO_AUTH_TOKEN ?? '';
	},
	get twilioPhoneNumber(): string {
		return process.env.TWILIO_PHONE_NUMBER ?? '';
	},
	get heatAlertNotifyLevels(): string[] {
		const raw = process.env.HEAT_ALERT_NOTIFY_LEVELS ?? 'danger,extreme-danger';
		return raw
			.split(',')
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean);
	},
	get heatAlertCooldownMinutes(): number {
		return Number(process.env.HEAT_ALERT_COOLDOWN_MINUTES ?? 60);
	},
	get heatAlertEmailEnabled(): boolean {
		return (process.env.HEAT_ALERT_EMAIL_ENABLED ?? 'true').toLowerCase() !== 'false';
	},
	get heatAlertSmsEnabled(): boolean {
		return (process.env.HEAT_ALERT_SMS_ENABLED ?? 'false').toLowerCase() === 'true';
	},
	get aiModelProvider(): 'gemini' | 'python' | 'fallback' {
		const raw = (process.env.AI_MODEL_PROVIDER ?? 'gemini').toLowerCase();
		if (raw === 'python' || raw === 'fallback') {
			return raw;
		}
		return 'gemini';
	},
	get pythonExecutable(): string {
		return process.env.PYTHON_EXECUTABLE ?? defaultPythonExecutable();
	},
	get pythonModelDir(): string {
		return (
			process.env.PYTHON_MODEL_DIR ??
			path.resolve(process.cwd(), 'backend', 'components', 'AIModel', 'python', 'model')
		);
	},
	get pythonScriptPath(): string {
		return (
			process.env.PYTHON_AI_SCRIPT ??
			path.resolve(process.cwd(), 'backend', 'components', 'AIModel', 'python', 'ai.py')
		);
	},
};

export const hasWeatherApiKey = (): boolean => env.openWeatherApiKey.trim().length > 0;

export const hasGeminiApiKey = (): boolean => env.googleGeminiApiKey.trim().length > 0;

export const hasWeatherSchedulerToken = (): boolean => env.weatherSchedulerToken.trim().length > 0;

export const hasAndroidSmsGatewayConfig = (): boolean =>
	env.androidSmsGatewayUrl.trim().length > 0 && env.androidSmsHeartbeatUrl.trim().length > 0;

export const hasTwilioConfig = (): boolean =>
	env.twilioAccountSid.trim().length > 0 &&
	env.twilioAuthToken.trim().length > 0 &&
	env.twilioPhoneNumber.trim().length > 0;
