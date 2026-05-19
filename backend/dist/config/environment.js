"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasGeminiApiKey = exports.hasWeatherApiKey = exports.env = void 0;
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 5000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',
    googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY ?? '',
    schoolLat: Number(process.env.SCHOOL_LAT ?? 14.575),
    schoolLon: Number(process.env.SCHOOL_LON ?? 121.025),
};
const hasWeatherApiKey = () => exports.env.openWeatherApiKey.trim().length > 0;
exports.hasWeatherApiKey = hasWeatherApiKey;
const hasGeminiApiKey = () => exports.env.googleGeminiApiKey.trim().length > 0;
exports.hasGeminiApiKey = hasGeminiApiKey;
//# sourceMappingURL=environment.js.map