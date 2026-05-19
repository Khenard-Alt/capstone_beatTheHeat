"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const incidentsController_1 = require("../controllers/incidentsController");
const router = express_1.default.Router();
/**
 * GET /api/incidents
 * List student health incidents
 */
router.get('/', incidentsController_1.incidentsController.list);
exports.default = router;
//# sourceMappingURL=incidents.routes.js.map