"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parentMessagesController_1 = __importDefault(require("../controllers/parentMessagesController"));
const router = (0, express_1.Router)();
// GET /api/parent-messages
router.get('/', parentMessagesController_1.default.list);
// POST /api/parent-messages
router.post('/', parentMessagesController_1.default.create);
exports.default = router;
//# sourceMappingURL=parentMessages.routes.js.map