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
	get weatherSchedulerToken(): string {
		return process.env.WEATHER_SCHEDULER_TOKEN ?? '';
	},
};

export const hasWeatherApiKey = (): boolean => env.openWeatherApiKey.trim().length > 0;

export const hasGeminiApiKey = (): boolean => env.googleGeminiApiKey.trim().length > 0;

export const hasWeatherSchedulerToken = (): boolean => env.weatherSchedulerToken.trim().length > 0;
