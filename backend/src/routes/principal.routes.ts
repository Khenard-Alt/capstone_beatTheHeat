import express from 'express';
import principalController from '../controllers/principalController';

const router = express.Router();

// GET /api/principal/approvals
router.get('/approvals', principalController.getPendingApprovals);

// GET /api/principal/reports
router.get('/reports', principalController.getSchoolReports);

export default router;
