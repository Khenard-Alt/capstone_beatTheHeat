import axios from 'axios';
import { env, hasWeatherApiKey } from '../config/environment';
import { WeatherForecastDay, WeatherSnapshot } from '../types';
import { auditLogService } from './auditLog.service';

interface OpenWeatherResponse {
	name: string;
	weather: Array<{ main: string; description: string }>;
	main: {
		temp: number;
		humidity: number;
		pressure: number;
	};
	wind: {
		speed: number;
	};
	dt: number;
}

interface OpenWeatherHistoricalResponse {
	timezone?: string;
	data?: Array<{
		dt?: number;
		temp?: number;
		humidity?: number;
		pressure?: number;
		wind_speed?: number;
		weather?: Array<{ main?: string; description?: string }>;
	}>;
}

interface OpenWeatherOneCallDailyResponse {
	timezone?: string;
	daily?: Array<{
		dt?: number;
		temp?: {
			day?: number;
		};
		humidity?: number;
		pressure?: number;
		wind_speed?: number;
		weather?: Array<{ main?: string; description?: string }>;
	}>;
}

interface OpenWeatherFiveDayForecastResponse {
	city?: {
		timezone?: number;
		name?: string;
	};
	list?: Array<{
		dt?: number;
		dt_txt?: string;
		main?: {
			temp?: number;
			humidity?: number;
			pressure?: number;
		};
		wind?: {
			speed?: number;
		};
		weather?: Array<{ main?: string; description?: string }>;
	}>;
}

interface WeatherBackfillFailure {
	dayOffset: number;
	reason: string;
}

export interface WeatherBackfillResult {
	requestedDays: number;
	intervalHours: number;
	inserted: number;
	mode: 'onecall-timemachine' | 'current-api-no-key';
	failures: WeatherBackfillFailure[];
	snapshots: WeatherSnapshot[];
}

export interface WeatherForecastResult {
	requestedDays: number;
	mode: 'onecall-daily' | 'five-day-forecast' | 'current-api-no-key';
	location: string;
	days: WeatherForecastDay[];
	notes: string[];
}

class WeatherService {
	private readonly schoolLocationName = env.schoolLocationName;

	public async collectScheduledSnapshot(lat = env.schoolLat, lon = env.schoolLon): Promise<WeatherSnapshot> {
		return this.getCurrentWeather(lat, lon);
	}

	public async backfillRecentDays(
		days: number,
		lat = env.schoolLat,
		lon = env.schoolLon,
		intervalHours = 3
	): Promise<WeatherBackfillResult> {
		const requestedDays = Math.max(1, Math.floor(days));
		const normalizedInterval = Math.min(24, Math.max(1, Math.floor(intervalHours)));
		const snapshots: WeatherSnapshot[] = [];
		const failures: WeatherBackfillFailure[] = [];

		if (!hasWeatherApiKey()) {
			return {
				requestedDays,
				intervalHours: normalizedInterval,
				inserted: 0,
				mode: 'current-api-no-key',
				failures: [
					{
						dayOffset: 0,
						reason:
							'OPENWEATHER_API_KEY is missing. Historical backfill requires an active OpenWeather key with timemachine access.',
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
			} catch (error) {
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

	public async getCurrentWeather(lat = env.schoolLat, lon = env.schoolLon): Promise<WeatherSnapshot> {
		if (!hasWeatherApiKey()) {
			const snapshot = this.getFallbackWeather();
			await this.persistSnapshot(snapshot);
			return snapshot;
		}

		try {
			const { data } = await axios.get<OpenWeatherResponse>(
				'https://api.openweathermap.org/data/2.5/weather',
				{
					params: {
						lat,
						lon,
						units: 'metric',
						appid: env.openWeatherApiKey,
					},
					timeout: 8000,
				}
			);

			const snapshot = this.toSnapshot(data);
			await this.persistSnapshot(snapshot);
			return snapshot;
		} catch (error) {
			console.error('OpenWeatherMap fetch failed, using fallback:', error);
			const snapshot = this.getFallbackWeather();
			await this.persistSnapshot(snapshot);
			return snapshot;
		}
	}

	public async getForecastOutlook(
		days = 7,
		lat = env.schoolLat,
		lon = env.schoolLon
	): Promise<WeatherForecastResult> {
		const requestedDays = Math.min(7, Math.max(1, Math.floor(days)));

		if (!hasWeatherApiKey()) {
			const fallback = this.getFallbackWeather();
			return {
				requestedDays,
				mode: 'current-api-no-key',
				location: fallback.location,
				days: [
					{
						source: fallback.source,
						location: fallback.location,
						date: fallback.timestamp.slice(0, 10),
						temperatureC: fallback.temperatureC,
						humidityPercent: fallback.humidityPercent,
						condition: fallback.condition,
						windSpeedMps: fallback.windSpeedMps,
						pressureHpa: fallback.pressureHpa,
						heatIndexC: fallback.heatIndexC,
						heatLevel: fallback.heatLevel,
					},
				],
				notes: ['OPENWEATHER_API_KEY is missing. Returning fallback-based outlook.'],
			};
		}

		const oneCallResult = await this.tryFetchOneCallForecast(requestedDays, lat, lon);
		if (oneCallResult) {
			return oneCallResult;
		}

		const fiveDayResult = await this.fetchFiveDayForecast(requestedDays, lat, lon);
		return fiveDayResult;
	}

	private async fetchHistoricalSnapshots(
		lat: number,
		lon: number,
		unixTime: number,
		intervalHours: number
	): Promise<WeatherSnapshot[]> {
		const { data } = await axios.get<OpenWeatherHistoricalResponse>(
			'https://api.openweathermap.org/data/3.0/onecall/timemachine',
			{
				params: {
					lat,
					lon,
					dt: unixTime,
					units: 'metric',
					appid: env.openWeatherApiKey,
				},
				timeout: 8000,
			}
		);

		const points = (data.data ?? [])
			.filter((point) => typeof point.temp === 'number' && typeof point.humidity === 'number')
			.sort((a, b) => (a.dt ?? 0) - (b.dt ?? 0));

		if (points.length === 0) {
			throw new Error('Historical weather response did not include valid temp/humidity fields.');
		}

		const stride = Math.min(24, Math.max(1, Math.floor(intervalHours)));
		const snapshots: WeatherSnapshot[] = [];

		for (let index = 0; index < points.length; index += stride) {
			const point = points[index];
			snapshots.push(this.toHistoricalSnapshot(point, data.timezone, unixTime));
		}

		return snapshots;
	}

	private async tryFetchOneCallForecast(
		requestedDays: number,
		lat: number,
		lon: number
	): Promise<WeatherForecastResult | null> {
		try {
			const { data } = await axios.get<OpenWeatherOneCallDailyResponse>(
				'https://api.openweathermap.org/data/3.0/onecall',
				{
					params: {
						lat,
						lon,
						units: 'metric',
						appid: env.openWeatherApiKey,
						exclude: 'minutely,hourly,alerts',
					},
					timeout: 8000,
				}
			);

			const daily = (data.daily ?? [])
				.slice(0, requestedDays)
				.filter((day) => typeof day.dt === 'number' && typeof day.temp?.day === 'number');

			if (daily.length === 0) {
				return null;
			}

			const days = daily.map((day) => this.toDailyForecastDay(day, data.timezone));
			return {
				requestedDays,
				mode: 'onecall-daily',
				location: this.schoolLocationName,
				days,
				notes: ['Real forecast data fetched from OpenWeather One Call daily forecast.'],
			};
		} catch (error) {
			console.warn('OpenWeather One Call forecast unavailable, falling back to 5-day forecast:', this.toErrorMessage(error));
			return null;
		}
	}

	private async fetchFiveDayForecast(
		requestedDays: number,
		lat: number,
		lon: number
	): Promise<WeatherForecastResult> {
		const { data } = await axios.get<OpenWeatherFiveDayForecastResponse>(
			'https://api.openweathermap.org/data/2.5/forecast',
			{
				params: {
					lat,
					lon,
					units: 'metric',
					appid: env.openWeatherApiKey,
				},
				timeout: 8000,
			}
		);

		const grouped = new Map<string, NonNullable<OpenWeatherFiveDayForecastResponse['list']>[number]>();
		for (const point of data.list ?? []) {
			if (!point.dt_txt || typeof point.main?.temp !== 'number') {
				continue;
			}

			const dateKey = point.dt_txt.slice(0, 10);
			const existing = grouped.get(dateKey);
			const hour = Number(point.dt_txt.slice(11, 13));
			if (!existing || Math.abs(hour - 12) < Math.abs(Number(existing.dt_txt?.slice(11, 13) ?? '0') - 12)) {
				grouped.set(dateKey, point);
			}
		}

		const sortedDays = Array.from(grouped.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.slice(0, requestedDays)
			.map(([dateKey, point]) => this.toFiveDayForecastDay(dateKey, point, data.city?.name));

		return {
			requestedDays,
			mode: 'five-day-forecast',
			location: this.schoolLocationName,
			days: sortedDays,
			notes: [
				'Real forecast data fetched from OpenWeather 5-day forecast endpoint.',
				sortedDays.length < requestedDays
					? `Only ${sortedDays.length} forecast day(s) were available from the API.`
					: 'Forecast days grouped from 3-hour weather snapshots.',
			],
		};
	}

	private toDailyForecastDay(
		day: NonNullable<OpenWeatherOneCallDailyResponse['daily']>[number],
		timezone?: string
	): WeatherForecastDay {
		const temperatureC = Number(day.temp?.day?.toFixed(1) ?? 0);
		const humidityPercent = Number(day.humidity?.toFixed(0) ?? 0);
		const heatIndexC = Number(this.calculateHeatIndexC(temperatureC, humidityPercent).toFixed(1));

		return {
			source: 'openweathermap',
			location: this.schoolLocationName,
			date: new Date((day.dt ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10),
			temperatureC,
			humidityPercent,
			condition: day.weather?.[0]?.description ?? day.weather?.[0]?.main ?? timezone ?? 'forecast',
			windSpeedMps: Number((day.wind_speed ?? 0).toFixed(1)),
			pressureHpa: Number((day.pressure ?? 0).toFixed(0)),
			heatIndexC,
			heatLevel: this.getHeatLevel(heatIndexC),
		};
	}

	private toFiveDayForecastDay(
		dateKey: string,
		point: NonNullable<OpenWeatherFiveDayForecastResponse['list']>[number],
		cityName?: string
	): WeatherForecastDay {
		const temperatureC = Number(point.main?.temp?.toFixed(1) ?? 0);
		const humidityPercent = Number(point.main?.humidity?.toFixed(0) ?? 0);
		const heatIndexC = Number(this.calculateHeatIndexC(temperatureC, humidityPercent).toFixed(1));

		return {
			source: 'openweathermap',
			location: cityName ?? this.schoolLocationName,
			date: dateKey,
			temperatureC,
			humidityPercent,
			condition: point.weather?.[0]?.description ?? point.weather?.[0]?.main ?? 'forecast',
			windSpeedMps: Number((point.wind?.speed ?? 0).toFixed(1)),
			pressureHpa: Number((point.main?.pressure ?? 0).toFixed(0)),
			heatIndexC,
			heatLevel: this.getHeatLevel(heatIndexC),
		};
	}

	private toHistoricalSnapshot(
		point: NonNullable<OpenWeatherHistoricalResponse['data']>[number],
		timezone: string | undefined,
		unixTime: number
	): WeatherSnapshot {
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

	private async persistSnapshot(snapshot: WeatherSnapshot): Promise<void> {
		try {
			await auditLogService.logWeatherSnapshot(snapshot);
		} catch (error) {
			console.error('Failed to persist weather snapshot:', error);
		}
	}

	private toSnapshot(data: OpenWeatherResponse): WeatherSnapshot {
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

	private getFallbackWeather(): WeatherSnapshot {
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

	private calculateHeatIndexC(tempC: number, humidity: number): number {
		const tempF = (tempC * 9) / 5 + 32;
		const hiF =
			-42.379 +
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

	private getHeatLevel(heatIndexC: number): WeatherSnapshot['heatLevel'] {
		if (heatIndexC < 27) return 'safe';
		if (heatIndexC < 32) return 'caution';
		if (heatIndexC < 41) return 'extreme-caution';
		if (heatIndexC < 54) return 'danger';
		return 'extreme-danger';
	}

	private toErrorMessage(error: unknown): string {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			const payload =
				typeof error.response?.data === 'string'
					? error.response.data
					: JSON.stringify(error.response?.data ?? {});
			return `OpenWeather error${status ? ` (${status})` : ''}: ${payload}`;
		}

		return error instanceof Error ? error.message : 'Unknown historical backfill error';
	}
}

export const weatherService = new WeatherService();
