import { Router } from 'express';
import { getCurrentWeather, getWeatherForecast, runScheduledSnapshot, runWeatherBackfill } from '../controllers/weatherController';

const router = Router();

router.get('/current', getCurrentWeather);
router.get('/forecast', getWeatherForecast);
router.post('/scheduled/snapshot', runScheduledSnapshot);
router.post('/scheduled/backfill', runWeatherBackfill);

export default router;
