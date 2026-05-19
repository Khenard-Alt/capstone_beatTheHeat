"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWeather = void 0;
const weather_service_1 = require("../services/weather.service");
const getCurrentWeather = async (req, res, next) => {
    try {
        const lat = req.query.lat ? Number(req.query.lat) : undefined;
        const lon = req.query.lon ? Number(req.query.lon) : undefined;
        const weather = await weather_service_1.weatherService.getCurrentWeather(lat, lon);
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
//# sourceMappingURL=weatherController.js.map