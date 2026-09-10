import express, { Router } from 'express';
import { getCampusAlert, setCampusAlert } from '../controllers/campusAlertController';

const router: Router = express.Router();

/**
 * GET /api/campus-alert
 * Fetch the current manual class-suspension override for the Front Screen display.
 */
router.get('/', getCampusAlert);

/**
 * PUT /api/campus-alert
 * Set/toggle the manual class-suspension override (principal-controlled).
 */
router.put('/', setCampusAlert);

export default router;
