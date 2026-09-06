import { Router } from 'express';
import { generateHealthAdvisory, getHealthAdvisories, getRealtimeAdvisory } from '../controllers/healthAdvisoryController';

const router = Router();

router.get('/', getHealthAdvisories);
router.get('/realtime', getRealtimeAdvisory);
router.post('/generate', generateHealthAdvisory);

export default router;
