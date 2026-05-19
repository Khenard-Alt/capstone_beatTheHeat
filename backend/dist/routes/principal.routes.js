"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const principalController_1 = __importDefault(require("../controllers/principalController"));
const router = express_1.default.Router();
// GET /api/principal/approvals
router.get('/approvals', principalController_1.default.getPendingApprovals);
// GET /api/principal/reports
router.get('/reports', principalController_1.default.getSchoolReports);
exports.default = router;
//# sourceMappingURL=principal.routes.js.map