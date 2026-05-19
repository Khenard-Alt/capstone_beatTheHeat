"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weatherService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const auditLog_service_1 = require("./auditLog.service");
class WeatherService {
    constructor() {
        this.schoolLocationName = 'Mayamot Elementary School, Antipolo City';
    }
    async collectScheduledSnapshot(lat = environment_1.env.schoolLat, lon = environment_1.env.schoolLon) {
        return this.getCurrentWeather(lat, lon);
    }
    async backfillRecentDays(days, lat = environment_1.env.schoolLat, lon = environment_1.env.schoolLon, intervalHours = 3) {
        const requestedDays = Math.max(1, Math.floor(days));
        const normalizedInterval = Math.min(24, Math.max(1, Math.floor(intervalHours)));
        const snapshots = [];
        const failures = [];
        if (!(0, environment_1.hasWeatherApiKey)()) {
            return {
                requestedDays,
                intervalHours: normalizedInterval,
                inserted: 0,
                mode: 'current-api-no-key',
                failures: [
                    {
                        dayOffset: 0,
                        reason: 'OPENWEATHER_API_KEY is missing. Historical backfill requires an active OpenWeather key with timemachine access.',
                    },
                ],
                snapshots,
            };
        }
        for (let dayOffset = requestedDays; dayOffset >= 1; dayOffset -= 1) {
            const target = new Date();
            target.setUTCDate(target.getUTCDate() - dayOffset);
            target.setUTCHours(12, 0, 0, 0);
            const unixTime = Math.floor(target.getTime() / 1000);
            try {
                const dailySnapshots = await this.fetchHistoricalSnapshots(lat, lon, unixTime, normalizedInterval);
                for (const snapshot of dailySnapshots) {
                    snapshots.push(snapshot);
                    await this.persistSnapshot(snapshot);
                }
            }
            catch (error) {
                failures.push({
                    dayOffset,
                    reason: this.toErrorMessage(error),
                });
            }
        }
        return {
            requestedDays,
            intervalHours: normalizedInterval,
            inserted: snapshots.length,
            mode: 'onecall-timemachine',
            failures,
            snapshots,
        };
    }
    async getCurrentWeather(lat = environment_1.env.schoolLat, lon = environment_1.env.schoolLon) {
        if (!(0, environment_1.hasWeatherApiKey)()) {
            const snapshot = this.getFallbackWeather();
            await this.persistSnapshot(snapshot);
            return snapshot;
        }
        try {
            const { data } = await axios_1.default.get('https://api.openweathermap.org/data/2.5/weather', {
                params: {
                    lat,
                    lon,
                    units: 'metric',
                    appid: environment_1.env.openWeatherApiKey,
                },
                timeout: 8000,
            });
            const snapshot = this.toSnapshot(data);
            await this.persistSnapshot(snapshot);
            return snapshot;
        }
        catch (error) {
            console.error('OpenWeatherMap fetch failed, using fallback:', error);
            const snapshot = this.getFallbackWeather();
            await this.persistSnapshot(snapshot);
            return snapshot;
        }
    }
    async fetchHistoricalSnapshots(lat, lon, unixTime, intervalHours) {
        const { data } = await axios_1.default.get('https://api.openweathermap.org/data/3.0/onecall/timemachine', {
            params: {
                lat,
                lon,
                dt: unixTime,
                units: 'metric',
                appid: environment_1.env.openWeatherApiKey,
            },
            timeout: 8000,
        });
        const points = (data.data ?? [])
            .filter((point) => typeof point.temp === 'number' && typeof point.humidity === 'number')
            .sort((a, b) => (a.dt ?? 0) - (b.dt ?? 0));
        if (points.length === 0) {
            throw new Error('Historical weather response did not include valid temp/humidity fields.');
        }
        const stride = Math.min(24, Math.max(1, Math.floor(intervalHours)));
        const snapshots = [];
        for (let index = 0; index < points.length; index += stride) {
            const point = points[index];
            snapshots.push(this.toHistoricalSnapshot(point, data.timezone, unixTime));
        }
        return snapshots;
    }
    toHistoricalSnapshot(point, timezone, unixTime) {
        const temperatureC = Number(point.temp?.toFixed(1) ?? 0);
        const humidityPercent = Number(point.humidity?.toFixed(0) ?? 0);
        const heatIndexC = Number(this.calculateHeatIndexC(temperatureC, humidityPercent).toFixed(1));
        return {
            source: 'openweathermap',
            location: this.schoolLocationName,
            temperatureC,
            humidityPercent,
            condition: point.weather?.[0]?.description ?? point.weather?.[0]?.main ?? timezone ?? 'historical clear',
            windSpeedMps: Number((point.wind_speed ?? 0).toFixed(1)),
            pressureHpa: Number((point.pressure ?? 0).toFixed(0)),
            heatIndexC,
            heatLevel: this.getHeatLevel(heatIndexC),
            timestamp: new Date((point.dt ?? unixTime) * 1000).toISOString(),
        };
    }
    async persistSnapshot(snapshot) {
        try {
            await auditLog_service_1.auditLogService.logWeatherSnapshot(snapshot);
        }
        catch (error) {
            console.error('Failed to persist weather snapshot:', error);
        }
    }
    toSnapshot(data) {
        const temperatureC = Number(data.main.temp.toFixed(1));
        const humidityPercent = Number(data.main.humidity.toFixed(0));
        const heatIndexC = Number(this.calculateHeatIndexC(temperatureC, humidityPercent).toFixed(1));
        return {
            source: 'openweathermap',
            location: this.schoolLocationName,
            temperatureC,
            humidityPercent,
            condition: data.weather?.[0]?.description ?? data.weather?.[0]?.main ?? 'Unknown',
            windSpeedMps: Number((data.wind?.speed ?? 0).toFixed(1)),
            pressureHpa: Number((data.main?.pressure ?? 0).toFixed(0)),
            heatIndexC,
            heatLevel: this.getHeatLevel(heatIndexC),
            timestamp: new Date((data.dt ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        };
    }
    getFallbackWeather() {
        const temperatureC = 34.2;
        const humidityPercent = 71;
        const heatIndexC = Number(this.calculateHeatIndexC(temperatureC, humidityPercent).toFixed(1));
        return {
            source: 'fallback',
            location: this.schoolLocationName,
            temperatureC,
            humidityPercent,
            condition: 'partly cloudy',
            windSpeedMps: 2.8,
            pressureHpa: 1008,
            heatIndexC,
            heatLevel: this.getHeatLevel(heatIndexC),
            timestamp: new Date().toISOString(),
        };
    }
    calculateHeatIndexC(tempC, humidity) {
        const tempF = (tempC * 9) / 5 + 32;
        const hiF = -42.379 +
            2.04901523 * tempF +
            10.14333127 * humidity -
            0.22475541 * tempF * humidity -
            0.00683783 * tempF * tempF -
            0.05481717 * humidity * humidity +
            0.00122874 * tempF * tempF * humidity +
            0.00085282 * tempF * humidity * humidity -
            0.00000199 * tempF * tempF * humidity * humidity;
        const hiC = ((hiF - 32) * 5) / 9;
        return Number.isFinite(hiC) ? Math.max(hiC, tempC) : tempC;
    }
    getHeatLevel(heatIndexC) {
        if (heatIndexC < 27)
            return 'safe';
        if (heatIndexC < 32)
            return 'caution';
        if (heatIndexC < 41)
            return 'extreme-caution';
        if (heatIndexC < 54)
            return 'danger';
        return 'extreme-danger';
    }
    toErrorMessage(error) {
        if (axios_1.default.isAxiosError(error)) {
            const status = error.response?.status;
            const payload = typeof error.response?.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response?.data ?? {});
            return `OpenWeather error${status ? ` (${status})` : ''}: ${payload}`;
        }
        return error instanceof Error ? error.message : 'Unknown historical backfill error';
    }
}
exports.weatherService = new WeatherService();
//# sourceMappingURL=weather.service.js.map