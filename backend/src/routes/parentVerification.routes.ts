import express, { Router } from 'express';
import { listPendingVerifications, approveVerification, rejectVerification } from '../controllers/parentVerificationController';

const router: Router = express.Router();

/**
 * GET /api/parent-verifications/pending
 * List pending parent-child link requests for staff review
 */
router.get('/pending', listPendingVerifications);

/**
 * POST /api/parent-verifications/:parentUserId/:studentId/approve
 */
router.post('/:parentUserId/:studentId/approve', express.json(), approveVerification);

/**
 * POST /api/parent-verifications/:parentUserId/:studentId/reject
 */
router.post('/:parentUserId/:studentId/reject', express.json(), rejectVerification);

export default router;
