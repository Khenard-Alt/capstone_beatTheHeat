import express, { Router } from 'express';
import { incidentsController } from '../controllers/incidentsController';

const router: Router = express.Router();

/**
 * GET /api/incidents
 * List student health incidents
 */
router.get('/', incidentsController.list);

export default router;
