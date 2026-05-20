import { Router } from 'express';
import { notificationsController } from '../controllers/notificationsController';

const router = Router();

router.post('/api/notifications/advisory', notificationsController.sendAdvisoryEmails);

export default router;
