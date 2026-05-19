"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasWeatherSchedulerToken = exports.hasGeminiApiKey = exports.hasWeatherApiKey = exports.env = void 0;
const path_1 = __importDefault(require("path"));
const defaultPythonExecutable = () => {
    const base = path_1.default.resolve(process.cwd(), '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    return base;
};
exports.env = {
    get nodeEnv() {
        return process.env.NODE_ENV ?? 'development';
    },
    get port() {
        return Number(process.env.PORT ?? 5000);
    },
    get corsOrigin() {
        return process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    },
    get openWeatherApiKey() {
        return process.env.OPENWEATHER_API_KEY ?? '';
    },
    get googleGeminiApiKey() {
        return process.env.GOOGLE_GEMINI_API_KEY ?? '';
    },
    get schoolLat() {
        return Number(process.env.SCHOOL_LAT ?? 14.575);
    },
    get schoolLon() {
        return Number(process.env.SCHOOL_LON ?? 121.025);
    },
    get weatherSchedulerToken() {
        return process.env.WEATHER_SCHEDULER_TOKEN ?? '';
    },
    get aiModelProvider() {
        const raw = (process.env.AI_MODEL_PROVIDER ?? 'gemini').toLowerCase();
        if (raw === 'python' || raw === 'fallback') {
            return raw;
        }
        return 'gemini';
    },
    get pythonExecutable() {
        return process.env.PYTHON_EXECUTABLE ?? defaultPythonExecutable();
    },
    get pythonModelDir() {
        return (process.env.PYTHON_MODEL_DIR ??
            path_1.default.resolve(process.cwd(), 'backend', 'components', 'AIModel', 'python', 'model'));
    },
    get pythonScriptPath() {
        return (process.env.PYTHON_AI_SCRIPT ??
            path_1.default.resolve(process.cwd(), 'backend', 'components', 'AIModel', 'python', 'ai.py'));
    },
};
const hasWeatherApiKey = () => exports.env.openWeatherApiKey.trim().length > 0;
exports.hasWeatherApiKey = hasWeatherApiKey;
const hasGeminiApiKey = () => exports.env.googleGeminiApiKey.trim().length > 0;
exports.hasGeminiApiKey = hasGeminiApiKey;
const hasWeatherSchedulerToken = () => exports.env.weatherSchedulerToken.trim().length > 0;
exports.hasWeatherSchedulerToken = hasWeatherSchedulerToken;
//# sourceMappingURL=environment.js.map