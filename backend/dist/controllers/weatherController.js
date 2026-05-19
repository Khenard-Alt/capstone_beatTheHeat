"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWeatherBackfill = exports.runScheduledSnapshot = exports.getCurrentWeather = void 0;
const weather_service_1 = require("../services/weather.service");
const environment_1 = require("../config/environment");
const getSchedulerTokenFromRequest = (req) => {
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
const ensureSchedulerAuth = (req, res) => {
    if (!(0, environment_1.hasWeatherSchedulerToken)()) {
        res.status(503).json({
            success: false,
            message: 'WEATHER_SCHEDULER_TOKEN is not configured on the server.',
        });
        return false;
    }
    const providedToken = getSchedulerTokenFromRequest(req);
    if (!providedToken || providedToken !== environment_1.env.weatherSchedulerToken) {
        res.status(401).json({
            success: false,
            message: 'Invalid or missing scheduler token.',
        });
        return false;
    }
    return true;
};
const getCurrentWeather = async (_req, res, next) => {
    try {
        const weather = await weather_service_1.weatherService.getCurrentWeather();
        res.status(200).json({
            success: true,
            data: weather,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentWeather = getCurrentWeather;
const runScheduledSnapshot = async (req, res, next) => {
    if (!ensureSchedulerAuth(req, res)) {
        return;
    }
    try {
        const weather = await weather_service_1.weatherService.collectScheduledSnapshot();
        res.status(200).json({
            success: true,
            data: weather,
            message: 'Scheduled weather snapshot completed.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.runScheduledSnapshot = runScheduledSnapshot;
const runWeatherBackfill = async (req, res, next) => {
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
        const result = await weather_service_1.weatherService.backfillRecentDays(days, undefined, undefined, intervalHours);
        res.status(200).json({
            success: true,
            data: result,
            message: result.inserted > 0
                ? 'Historical weather backfill completed.'
                : 'Backfill ran but no historical rows were inserted. Check API access and token.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.runWeatherBackfill = runWeatherBackfill;
//# sourceMappingURL=weatherController.js.map