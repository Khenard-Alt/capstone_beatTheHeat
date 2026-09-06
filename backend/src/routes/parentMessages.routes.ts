import { Router } from 'express';
import parentMessagesController from '../controllers/parentMessagesController';

const router = Router();

// GET /api/parent-messages
router.get('/', parentMessagesController.list);

// POST /api/parent-messages
router.post('/', parentMessagesController.create);

export default router;
