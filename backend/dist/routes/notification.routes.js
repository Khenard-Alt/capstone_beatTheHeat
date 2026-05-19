"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
/**
 * Get notifications for a user
 * GET /api/notifications?userId=...&limit=...&offset=...
 */
router.get('/', notificationController_1.notificationController.getNotifications);
/**
 * Send heat alert email to a specific user
 * POST /api/notifications/heat-alert
 */
router.post('/heat-alert', notificationController_1.notificationController.sendHeatAlert);
/**
 * Send advisory notification to multiple users
 * POST /api/notifications/advisory
 */
router.post('/advisory', notificationController_1.notificationController.sendAdvisoryNotification);
/**
 * Broadcast heat alert to all users in a school
 * POST /api/notifications/broadcast-heat-alert
 */
router.post('/broadcast-heat-alert', notificationController_1.notificationController.broadcastHeatAlert);
/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', notificationController_1.notificationController.markAsRead);
/**
 * Clear notifications for a user
 * DELETE /api/notifications/clear?userId=...
 */
router.delete('/clear', notificationController_1.notificationController.clearAll);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map