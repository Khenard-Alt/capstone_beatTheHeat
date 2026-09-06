"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.get('/stats', adminController_1.getAdminStats);
router.get('/parent-questions', adminController_1.getParentQuestionInsights);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map