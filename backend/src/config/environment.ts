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
	get weatherSchedulerToken(): string {
		return process.env.WEATHER_SCHEDULER_TOKEN ?? '';
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
