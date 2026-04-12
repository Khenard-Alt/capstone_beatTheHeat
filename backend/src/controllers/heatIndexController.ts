import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';
import { weatherService } from '../services/weather.service';

const fallbackHistory = async (period: string, limit: number): Promise<any[]> => {
	const snapshot = await weatherService.getCurrentWeather();

	const count = period === 'daily' ? Math.min(limit || 24, 24) : period === 'weekly' ? Math.min(limit || 7, 7) : Math.min(limit || 30, 30);
	const stepMs = period === 'daily' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

	return Array.from({ length: count }).map((_, idx) => {
		const t = count - 1 - idx;
		const observedAt = new Date(Date.now() - t * stepMs);
		const wave = Math.sin((idx / Math.max(count, 1)) * Math.PI * 2);

		const avgTemp = Number((snapshot.temperatureC + wave * 2.2).toFixed(1));
		const avgHumidity = Number((Math.max(45, Math.min(95, snapshot.humidityPercent - wave * 6))).toFixed(1));
		const avgHeatIndex = Number((Math.max(avgTemp, snapshot.heatIndexC + wave * 3)).toFixed(1));

		return {
			time: period === 'daily' ? observedAt.toISOString() : observedAt.toISOString().slice(0, 10),
			avgTemp,
			avgHumidity,
			avgHeatIndex,
			minHeatIndex: Number((avgHeatIndex - 1.8).toFixed(1)),
			maxHeatIndex: Number((avgHeatIndex + 1.8).toFixed(1)),
		};
	});
};

export const getHeatIndexHistory = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const period = (req.query.period as string) || 'daily';
		const limit = parseInt(req.query.limit as string) || 7;

		const client = getSupabaseAdminClient();
		if (!client) {
			const data = await fallbackHistory(period, limit);
			res.status(200).json({
				success: true,
				message: 'Serving fallback heat history (database not configured)',
				data,
				metadata: {
					period,
					limit,
					count: data.length,
				},
			});
			return;
		}

		let data: any[] = [];
		let error: any = null;

		// Fetch heat index logs and optional linked weather rows by weather_data_id.
		const { data: rawLogs, error: fetchError } = await client
			.from('heat_index_logs')
			.select('created_at, observed_at, weather_data_id, heat_index_c, heat_level')
			.order('created_at', { ascending: false })
			.limit(500); // Get last 500 records for analysis

		error = fetchError;

		if (!error && rawLogs) {
			const weatherIds = rawLogs
				.map((log: any) => log.weather_data_id)
				.filter((id: unknown) => typeof id === 'string');

			let weatherById = new Map<string, any>();
			if (weatherIds.length > 0) {
				const { data: weatherRows, error: weatherError } = await client
					.from('weather_data')
					.select('id, temperature_c, humidity_percent')
					.in('id', weatherIds);

				if (weatherError) {
					error = weatherError;
				} else {
					weatherById = new Map((weatherRows || []).map((row: any) => [row.id, row]));
				}
			}

			// Group data by period
			const grouped = new Map<string, any[]>();

			rawLogs.forEach((log: any) => {
				const observedAt = log.observed_at || log.created_at;
				const date = new Date(observedAt);
				let key: string;

				if (period === 'daily') {
					// Last 24 hours, grouped by hour
					const hoursAgo = Math.floor(
						(Date.now() - date.getTime()) / (1000 * 60 * 60)
					);
					if (hoursAgo <= 24) {
						key = date.toISOString().slice(0, 13) + ':00:00';
						if (!grouped.has(key)) grouped.set(key, []);
						grouped.get(key)!.push(log);
					}
				} else if (period === 'weekly') {
					// Last 7 days, grouped by day
					const daysAgo = Math.floor(
						(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
					);
					if (daysAgo <= 7) {
						key = date.toISOString().slice(0, 10);
						if (!grouped.has(key)) grouped.set(key, []);
						grouped.get(key)!.push(log);
					}
				} else {
					// Monthly (last 30 days), grouped by day
					const daysAgo = Math.floor(
						(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
					);
					if (daysAgo <= 30) {
						key = date.toISOString().slice(0, 10);
						if (!grouped.has(key)) grouped.set(key, []);
						grouped.get(key)!.push(log);
					}
				}
			});

			// Aggregate grouped data
			data = Array.from(grouped.entries())
				.map(([time, records]) => {
					const weatherRows = records
						.map((r: any) => weatherById.get(r.weather_data_id))
						.filter(Boolean);

					const temps = records
						.map((_r: any, idx: number) => weatherRows[idx]?.temperature_c ?? 0)
						.filter((t: number) => t > 0);
					const humidities = records
						.map((_r: any, idx: number) => weatherRows[idx]?.humidity_percent ?? 0)
						.filter((h: number) => h > 0);
					const heatIndexes = records.map((r: any) => Number(r.heat_index_c) || 0);

					const avgTemp =
						temps.length > 0
							? temps.reduce((a, b) => a + b, 0) / temps.length
							: 0;
					const avgHumidity =
						humidities.length > 0
							? humidities.reduce((a, b) => a + b, 0) / humidities.length
							: 0;
					const avgHeatIndex =
						heatIndexes.length > 0
							? heatIndexes.reduce((a, b) => a + b, 0) / heatIndexes.length
							: 0;
					const minHeatIndex = heatIndexes.length > 0 ? Math.min(...heatIndexes) : 0;
					const maxHeatIndex = heatIndexes.length > 0 ? Math.max(...heatIndexes) : 0;

					return {
						time,
						avgTemp: Math.round(avgTemp * 10) / 10,
						avgHumidity: Math.round(avgHumidity * 10) / 10,
						avgHeatIndex: Math.round(avgHeatIndex * 10) / 10,
						minHeatIndex: Math.round(minHeatIndex * 10) / 10,
						maxHeatIndex: Math.round(maxHeatIndex * 10) / 10,
					};
				})
				.sort(
					(a, b) =>
						new Date(a.time).getTime() - new Date(b.time).getTime()
				);
		}

		if (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to fetch heat index history',
				error: error.message,
			});
			return;
		}

		res.status(200).json({
			success: true,
			data,
			metadata: {
				period,
				limit,
				count: data.length,
			},
		});
	} catch (error) {
		next(error);
	}
};
