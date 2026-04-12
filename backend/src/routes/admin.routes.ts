import { Router } from 'express';
import { getAdminStats, getParentQuestionInsights } from '../controllers/adminController';

const router = Router();

router.get('/stats', getAdminStats);
router.get('/parent-questions', getParentQuestionInsights);

export default router;
