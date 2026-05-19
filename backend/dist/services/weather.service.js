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
            location: data.name || 'Mayamot Elementary School',
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
            location: 'Mayamot Elementary School',
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
}
exports.weatherService = new WeatherService();
//# sourceMappingURL=weather.service.js.map