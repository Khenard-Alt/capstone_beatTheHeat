
import express, { Router } from 'express';
import incidentsController from '../controllers/incidentsController';

const router: Router = express.Router();

/**
 * GET /api/incidents
 * List student health incidents
 */
router.get('/', incidentsController.list);

// POST /api/incidents
router.post('/', express.json(), incidentsController.create);

// GET /api/incidents/:id
router.get('/:id', incidentsController.getById);

// PUT /api/incidents/:id
router.put('/:id', express.json(), incidentsController.update);

// DELETE /api/incidents/:id
router.delete('/:id', incidentsController.remove);

export default router;
