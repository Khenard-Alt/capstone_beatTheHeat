"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const incidentsController_1 = __importDefault(require("../controllers/incidentsController"));
const router = express_1.default.Router();
/**
 * GET /api/incidents
 * List student health incidents
 */
router.get('/', incidentsController_1.default.list);
// POST /api/incidents
router.post('/', express_1.default.json(), incidentsController_1.default.create);
// GET /api/incidents/:id
router.get('/:id', incidentsController_1.default.getById);
// PUT /api/incidents/:id
router.put('/:id', express_1.default.json(), incidentsController_1.default.update);
// DELETE /api/incidents/:id
router.delete('/:id', incidentsController_1.default.remove);
exports.default = router;
//# sourceMappingURL=incidents.routes.js.map