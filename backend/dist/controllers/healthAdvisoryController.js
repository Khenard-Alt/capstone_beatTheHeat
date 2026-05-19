"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHealthAdvisory = void 0;
const aiAnalysis_service_1 = require("../services/aiAnalysis.service");
const weather_service_1 = require("../services/weather.service");
const generateHealthAdvisory = async (req, res, next) => {
    try {
        const query = typeof req.body?.query === 'string' ? req.body.query : '';
        const weather = req.body?.weather ?? (await weather_service_1.weatherService.getCurrentWeather());
        const advisory = await aiAnalysis_service_1.aiAnalysisService.generateScopedAdvisory({
            query,
            weather,
        });
        res.status(200).json({
            success: true,
            data: advisory,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateHealthAdvisory = generateHealthAdvisory;
//# sourceMappingURL=healthAdvisoryController.js.map