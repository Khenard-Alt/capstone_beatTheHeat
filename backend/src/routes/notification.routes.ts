import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';

const router = Router();

/**
 * Send heat alert email to a specific user
 * POST /api/notifications/heat-alert
 */
router.post('/heat-alert', notificationController.sendHeatAlert);

/**
 * Send advisory notification to multiple users
 * POST /api/notifications/advisory
 */
router.post('/advisory', notificationController.sendAdvisoryNotification);

/**
 * Broadcast heat alert to all users in a school
 * POST /api/notifications/broadcast-heat-alert
 */
router.post('/broadcast-heat-alert', notificationController.broadcastHeatAlert);

export default router;
