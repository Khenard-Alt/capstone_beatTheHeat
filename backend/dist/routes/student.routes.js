"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const studentController_1 = require("../controllers/studentController");
const router = express_1.default.Router();
/**
 * GET /api/students
 * Get all students for parent child dropdown
 */
router.get('/', studentController_1.getStudents);
/**
 * POST /api/students
 * Create a student record
 */
router.post('/', studentController_1.createStudent);
/**
 * GET /api/students/search?q=name
 * Search students by name
 */
router.get('/search', studentController_1.searchStudents);
/**
 * GET /api/students/:id
 * Get student by ID
 */
router.get('/:id', studentController_1.getStudentById);
/**
 * DELETE /api/students/:id
 * Delete a student by ID
 */
router.delete('/:id', studentController_1.deleteStudent);
exports.default = router;
//# sourceMappingURL=student.routes.js.map