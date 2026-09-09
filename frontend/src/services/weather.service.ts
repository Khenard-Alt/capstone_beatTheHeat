import type { WeatherData } from '../types';
import { apiClient } from './api';
import type { ApiEnvelope } from './api';

interface BackendWeatherSnapshot {
	source: 'openweathermap' | 'fallback';
	location: string;
	temperatureC: number;
	humidityPercent: number;
	condition: string;
	windSpeedMps: number;
	pressureHpa: number;
	heatIndexC: number;
	heatLevel: string;
	timestamp: string;
}

// Backend only sends a text condition (e.g. "moderate rain"), not an OpenWeatherMap
// icon code, so derive a simple sky-state icon key from keywords in that text.
const deriveIconFromCondition = (condition: string): string => {
	const value = condition.toLowerCase();
	if (/(rain|drizzle|storm|thunder|shower|snow|sleet)/.test(value)) return 'rainy';
	if (/(cloud|overcast|mist|haze|fog|smoke)/.test(value)) return 'cloudy';
	return 'sunny';
};

const toUiWeather = (payload: BackendWeatherSnapshot): WeatherData => ({
	id: payload.timestamp,
	schoolId: payload.location,
	temperature: payload.temperatureC,
	humidity: payload.humidityPercent,
	feelsLike: payload.heatIndexC,
	conditions: payload.condition,
	icon: deriveIconFromCondition(payload.condition),
	windSpeed: payload.windSpeedMps,
	pressure: payload.pressureHpa,
	timestamp: payload.timestamp,
});

export const fetchCurrentWeather = async (): Promise<WeatherData> => {
	const { data } = await apiClient.get<ApiEnvelope<BackendWeatherSnapshot>>('/api/weather/current');
	return toUiWeather(data.data);
};
