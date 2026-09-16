import { Router } from 'express';
import {
	getAdminStats,
	getParentQuestionInsights,
	getHeatThresholdsHandler,
	updateHeatThresholdsHandler,
} from '../controllers/adminController';

const router = Router();

router.get('/stats', getAdminStats);
router.get('/parent-questions', getParentQuestionInsights);
router.get('/heat-thresholds', getHeatThresholdsHandler);
router.put('/heat-thresholds', updateHeatThresholdsHandler);

export default router;
