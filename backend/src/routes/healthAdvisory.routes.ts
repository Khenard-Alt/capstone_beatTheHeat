import { Router } from 'express';
import { generateHealthAdvisory, getHealthAdvisories } from '../controllers/healthAdvisoryController';

const router = Router();

router.get('/', getHealthAdvisories);
router.post('/generate', generateHealthAdvisory);

export default router;
