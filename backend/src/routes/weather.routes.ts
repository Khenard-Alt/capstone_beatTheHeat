import { Router } from 'express';
import { getCurrentWeather, runScheduledSnapshot, runWeatherBackfill } from '../controllers/weatherController';

const router = Router();

router.get('/current', getCurrentWeather);
router.post('/scheduled/snapshot', runScheduledSnapshot);
router.post('/scheduled/backfill', runWeatherBackfill);

export default router;
