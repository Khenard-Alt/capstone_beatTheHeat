import { Router } from 'express';
import { getHeatIndexHistory } from '../controllers/heatIndexController';

const router = Router();

router.get('/history', getHeatIndexHistory);

export default router;
