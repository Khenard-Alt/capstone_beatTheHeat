import express, { Router } from 'express';
import { getStudents, searchStudents, getStudentById, createStudent, updateStudent, deleteStudent } from '../controllers/studentController';

const router: Router = express.Router();

/**
 * GET /api/students
 * Get all students for parent child dropdown
 */
router.get('/', getStudents);

/**
 * POST /api/students
 * Create a student record
 */
router.post('/', createStudent);

/**
 * GET /api/students/search?q=name
 * Search students by name
 */
router.get('/search', searchStudents);

/**
 * GET /api/students/:id
 * Get student by ID
 */
router.get('/:id', getStudentById);

/**
 * PUT /api/students/:id
 * Update a student record (e.g. assign an advisory teacher)
 */
router.put('/:id', updateStudent);

/**
 * DELETE /api/students/:id
 * Delete a student by ID
 */
router.delete('/:id', deleteStudent);

export default router;
