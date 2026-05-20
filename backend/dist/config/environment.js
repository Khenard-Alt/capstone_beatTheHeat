"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTwilioConfig = exports.hasAndroidSmsGatewayConfig = exports.hasWeatherSchedulerToken = exports.hasGeminiApiKey = exports.hasWeatherApiKey = exports.env = void 0;
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
    get smsProvider() {
        const raw = (process.env.SMS_PROVIDER ?? 'android-heartbeat').toLowerCase();
        return raw === 'twilio' ? 'twilio' : 'android-heartbeat';
    },
    get androidSmsGatewayUrl() {
        return process.env.ANDROID_SMS_GATEWAY_URL ?? '';
    },
    get androidSmsGatewayApiKey() {
        return process.env.ANDROID_SMS_GATEWAY_API_KEY ?? '';
    },
    get androidSmsGatewayUsername() {
        return process.env.ANDROID_SMS_GATEWAY_USERNAME ?? '';
    },
    get androidSmsGatewayPassword() {
        return process.env.ANDROID_SMS_GATEWAY_PASSWORD ?? '';
    },
    get androidSmsHeartbeatUrl() {
        return process.env.ANDROID_SMS_HEARTBEAT_URL ?? '';
    },
    get androidSmsHeartbeatTimeoutMs() {
        return Number(process.env.ANDROID_SMS_HEARTBEAT_TIMEOUT_MS ?? 5000);
    },
    get twilioAccountSid() {
        return process.env.TWILIO_ACCOUNT_SID ?? '';
    },
    get twilioAuthToken() {
        return process.env.TWILIO_AUTH_TOKEN ?? '';
    },
    get twilioPhoneNumber() {
        return process.env.TWILIO_PHONE_NUMBER ?? '';
    },
    get heatAlertNotifyLevels() {
        const raw = process.env.HEAT_ALERT_NOTIFY_LEVELS ?? 'danger,extreme-danger';
        return raw
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
    },
    get heatAlertCooldownMinutes() {
        return Number(process.env.HEAT_ALERT_COOLDOWN_MINUTES ?? 60);
    },
    get heatAlertEmailEnabled() {
        return (process.env.HEAT_ALERT_EMAIL_ENABLED ?? 'true').toLowerCase() !== 'false';
    },
    get heatAlertSmsEnabled() {
        return (process.env.HEAT_ALERT_SMS_ENABLED ?? 'false').toLowerCase() === 'true';
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
const hasAndroidSmsGatewayConfig = () => exports.env.androidSmsGatewayUrl.trim().length > 0 && exports.env.androidSmsHeartbeatUrl.trim().length > 0;
exports.hasAndroidSmsGatewayConfig = hasAndroidSmsGatewayConfig;
const hasTwilioConfig = () => exports.env.twilioAccountSid.trim().length > 0 &&
    exports.env.twilioAuthToken.trim().length > 0 &&
    exports.env.twilioPhoneNumber.trim().length > 0;
exports.hasTwilioConfig = hasTwilioConfig;
//# sourceMappingURL=environment.js.map