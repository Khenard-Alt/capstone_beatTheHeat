"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthAdvisoryController_1 = require("../controllers/healthAdvisoryController");
const router = (0, express_1.Router)();
router.get('/', healthAdvisoryController_1.getHealthAdvisories);
router.get('/realtime', healthAdvisoryController_1.getRealtimeAdvisory);
router.post('/generate', healthAdvisoryController_1.generateHealthAdvisory);
exports.default = router;
//# sourceMappingURL=healthAdvisory.routes.js.map