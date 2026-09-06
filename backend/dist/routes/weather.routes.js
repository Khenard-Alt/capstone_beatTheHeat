"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const weatherController_1 = require("../controllers/weatherController");
const router = (0, express_1.Router)();
router.get('/current', weatherController_1.getCurrentWeather);
router.get('/forecast', weatherController_1.getWeatherForecast);
router.post('/scheduled/snapshot', weatherController_1.runScheduledSnapshot);
router.post('/scheduled/backfill', weatherController_1.runWeatherBackfill);
exports.default = router;
//# sourceMappingURL=weather.routes.js.map