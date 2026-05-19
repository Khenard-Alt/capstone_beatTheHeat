"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const heatIndexController_1 = require("../controllers/heatIndexController");
const router = (0, express_1.Router)();
router.get('/history', heatIndexController_1.getHeatIndexHistory);
exports.default = router;
//# sourceMappingURL=heatIndex.routes.js.map