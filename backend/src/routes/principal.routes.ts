import express from 'express';
import principalController from '../controllers/principalController';

const router = express.Router();

// GET /api/principal/approvals
router.get('/approvals', principalController.getPendingApprovals);

// GET /api/principal/reports
router.get('/reports', principalController.getSchoolReports);

// GET /api/principal/stats
router.get('/stats', principalController.getPrincipalStats);

// GET /api/principal/incident-trends
router.get('/incident-trends', principalController.getIncidentTrends);

export default router;
