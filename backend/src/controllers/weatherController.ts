import { Request, Response, NextFunction } from 'express';
import { weatherService } from '../services/weather.service';
import { env, hasWeatherSchedulerToken } from '../config/environment';

const getSchedulerTokenFromRequest = (req: Request): string => {
	const headerToken = req.header('x-scheduler-token');
	if (headerToken) {
		return headerToken;
	}

	const authHeader = req.header('authorization') ?? '';
	if (authHeader.toLowerCase().startsWith('bearer ')) {
		return authHeader.slice(7).trim();
	}

	return '';
};

const ensureSchedulerAuth = (req: Request, res: Response): boolean => {
	if (!hasWeatherSchedulerToken()) {
		res.status(503).json({
			success: false,
			message: 'WEATHER_SCHEDULER_TOKEN is not configured on the server.',
		});
		return false;
	}

	const providedToken = getSchedulerTokenFromRequest(req);
	if (!providedToken || providedToken !== env.weatherSchedulerToken) {
		res.status(401).json({
			success: false,
			message: 'Invalid or missing scheduler token.',
		});
		return false;
	}

	return true;
};

export const getCurrentWeather = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const lat = req.query.lat ? Number(req.query.lat) : undefined;
		const lon = req.query.lon ? Number(req.query.lon) : undefined;

		const weather = await weatherService.getCurrentWeather(lat, lon);

		res.status(200).json({
			success: true,
			data: weather,
		});
	} catch (error) {
		next(error);
	}
};

export const runScheduledSnapshot = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	if (!ensureSchedulerAuth(req, res)) {
		return;
	}

	try {
		const lat = req.body?.lat ? Number(req.body.lat) : undefined;
		const lon = req.body?.lon ? Number(req.body.lon) : undefined;

		const weather = await weatherService.collectScheduledSnapshot(lat, lon);

		res.status(200).json({
			success: true,
			data: weather,
			message: 'Scheduled weather snapshot completed.',
		});
	} catch (error) {
		next(error);
	}
};

export const runWeatherBackfill = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	if (!ensureSchedulerAuth(req, res)) {
		return;
	}

	try {
		const rawDays = Number(req.body?.days ?? req.query.days ?? 3);
		const days = Number.isFinite(rawDays) ? Math.min(7, Math.max(1, Math.floor(rawDays))) : 3;
		const rawInterval = Number(req.body?.intervalHours ?? req.query.intervalHours ?? 3);
		const intervalHours = Number.isFinite(rawInterval)
			? Math.min(24, Math.max(1, Math.floor(rawInterval)))
			: 3;
		const lat = req.body?.lat ? Number(req.body.lat) : undefined;
		const lon = req.body?.lon ? Number(req.body.lon) : undefined;

		const result = await weatherService.backfillRecentDays(days, lat, lon, intervalHours);

		res.status(200).json({
			success: true,
			data: result,
			message:
				result.inserted > 0
					? 'Historical weather backfill completed.'
					: 'Backfill ran but no historical rows were inserted. Check API access and token.',
		});
	} catch (error) {
		next(error);
	}
};
