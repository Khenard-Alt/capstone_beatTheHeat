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

const toUiWeather = (payload: BackendWeatherSnapshot): WeatherData => ({
	id: payload.timestamp,
	schoolId: payload.location,
	temperature: payload.temperatureC,
	humidity: payload.humidityPercent,
	feelsLike: payload.heatIndexC,
	conditions: payload.condition,
	icon: '01d',
	windSpeed: payload.windSpeedMps,
	pressure: payload.pressureHpa,
	timestamp: payload.timestamp,
});

export const fetchCurrentWeather = async (): Promise<WeatherData> => {
	const { data } = await apiClient.get<ApiEnvelope<BackendWeatherSnapshot>>('/api/weather/current');
	return toUiWeather(data.data);
};
