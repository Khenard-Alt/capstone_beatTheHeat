"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const announcementsController_1 = __importDefault(require("../controllers/announcementsController"));
const express_2 = __importDefault(require("express"));
const router = (0, express_1.Router)();
// GET /api/announcements
router.get('/', announcementsController_1.default.getAnnouncements);
// POST /api/announcements
router.post('/', express_2.default.json(), announcementsController_1.default.createAnnouncement);
exports.default = router;
//# sourceMappingURL=announcements.routes.js.map