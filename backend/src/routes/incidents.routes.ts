
import express, { Router } from 'express';
import { incidentsController } from '../controllers/incidentsController';

const router: Router = express.Router();

/**
 * GET /api/incidents
 * List student health incidents
 */
router.get('/', incidentsController.list);

// POST /api/incidents
router.post('/', express.json(), incidentsController.create);

export default router;
