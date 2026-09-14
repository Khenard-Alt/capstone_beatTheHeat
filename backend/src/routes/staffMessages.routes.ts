import { Router } from 'express';
import staffMessagesController from '../controllers/staffMessagesController';

const router = Router();

// GET /api/staff-messages?userId=&peerId=
router.get('/', staffMessagesController.list);
// POST /api/staff-messages
router.post('/', staffMessagesController.create);

export default router;
