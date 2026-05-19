import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';

const router = Router();

/**
 * Get notifications for a user
 * GET /api/notifications?userId=...&limit=...&offset=...
 */
router.get('/', notificationController.getNotifications);

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

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * Clear notifications for a user
 * DELETE /api/notifications/clear?userId=...
 */
router.delete('/clear', notificationController.clearAll);

export default router;
