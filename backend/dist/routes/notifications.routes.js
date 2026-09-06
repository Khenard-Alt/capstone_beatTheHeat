"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationsController_1 = require("../controllers/notificationsController");
const router = (0, express_1.Router)();
router.post('/api/notifications/advisory', notificationsController_1.notificationsController.sendAdvisoryEmails);
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map