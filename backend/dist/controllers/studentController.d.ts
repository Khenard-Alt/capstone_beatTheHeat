import { Request, Response, NextFunction } from 'express';
/**
 * Get students for parent child dropdown and admin listings
 * GET /api/students
 */
export declare const getStudents: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
/**
 * Search students by name
 * GET /api/students/search?q=name
 */
export declare const searchStudents: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
/**
 * Get student by ID
 * GET /api/students/:id
 */
export declare const getStudentById: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
/**
 * Create a student record
 * POST /api/students
 */
export declare const createStudent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete a student by ID
 * DELETE /api/students/:id
 */
export declare const deleteStudent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=studentController.d.ts.map