import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

const fallbackStudents = [
  { id: 's1', name: 'Juan Dela Cruz', grade: 'Grade 3', schoolId: 'school-1' },
  { id: 's2', name: 'Maria Santos', grade: 'Grade 5', schoolId: 'school-1' },
  { id: 's3', name: 'Carlos Reyes', grade: 'Grade 4', schoolId: 'school-1' },
];

const mapStudentRow = (student: {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  school_id: string;
}) => ({
  id: student.id,
  name: `${student.first_name} ${student.last_name}`,
  grade: student.grade_level ?? undefined,
  schoolId: student.school_id,
});

const fallbackStudentRecord = (input: {
  id?: string;
  studentNumber?: string;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
  section?: string;
  parentUserId?: string | null;
}) => ({
  id: input.id ?? `student-${Date.now()}`,
  name: `${input.firstName} ${input.lastName}`,
  grade: input.gradeLevel,
  schoolId: 'school-1',
  studentNumber: input.studentNumber,
  section: input.section,
  parentUserId: input.parentUserId ?? null,
});

/**
 * Get all students (for parent child dropdown)
 * GET /api/students
 */
export const getStudents = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const client = getSupabaseAdminClient();

    // If no database, return fallback students
    if (!client) {
      res.status(200).json({
        success: true,
        message: 'Students (fallback mode)',
        students: fallbackStudents,
      });
      return;
    }

    const { data, error } = await client
      .from('students')
      .select('id, first_name, last_name, grade_level, school_id')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.warn('Students table query failed, using fallback data:', error);
      res.status(200).json({
        success: true,
        message: 'Students (fallback mode)',
        students: fallbackStudents,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Students',
      students: (data ?? []).map(mapStudentRow),
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

/**
 * Search students by name
 * GET /api/students/search?q=name
 */
export const searchStudents = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    const query = q.toLowerCase().trim();

    const client = getSupabaseAdminClient();

    if (!client) {
      const results = fallbackStudents.filter((student) =>
        student.name.toLowerCase().includes(query)
      );

      res.status(200).json({
        success: true,
        message: 'Search results',
        students: results,
        count: results.length,
      });
      return;
    }

    const { data, error } = await client
      .from('students')
      .select('id, first_name, last_name, grade_level, school_id');

    if (error) {
      console.warn('Student search query failed, using fallback data:', error);
      const results = fallbackStudents.filter((student) =>
        student.name.toLowerCase().includes(query)
      );

      res.status(200).json({
        success: true,
        message: 'Search results',
        students: results,
        count: results.length,
      });
      return;
    }

    const results = (data ?? [])
      .map(mapStudentRow)
      .filter((student) => student.name.toLowerCase().includes(query));

    res.status(200).json({
      success: true,
      message: 'Search results',
      students: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({ success: false, message: 'Failed to search students' });
  }
};

/**
 * Get student by ID
 * GET /api/students/:id
 */
export const getStudentById = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Student ID is required' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      const student = fallbackStudents.find((s) => s.id === id);

      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Student found',
        student,
      });
      return;
    }

    const { data, error } = await client
      .from('students')
      .select('id, first_name, last_name, grade_level, school_id')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Student found',
      student: mapStudentRow(data),
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};

/**
 * Create a student record
 * POST /api/students
 */
export const createStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, studentNumber, firstName, lastName, gradeLevel, section, parentUserId } = req.body;

    if (!firstName || !lastName) {
      res.status(400).json({ success: false, message: 'First name and last name are required' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      const fallback = fallbackStudentRecord({
        id,
        studentNumber,
        firstName,
        lastName,
        gradeLevel,
        section,
        parentUserId,
      });

      res.status(201).json({
        success: true,
        message: 'Student created (fallback mode)',
        student: fallback,
      });
      return;
    }

    const studentId = typeof id === 'string' && id.trim().length > 0 ? id.trim() : crypto.randomUUID();

    const { data, error } = await client
      .from('students')
      .insert([
        {
          id: studentId,
          student_number: studentNumber || null,
          first_name: firstName,
          last_name: lastName,
          grade_level: gradeLevel || null,
          section: section || null,
          parent_user_id: parentUserId || null,
          school_id: 'school-1',
          status: 'active',
        },
      ])
      .select('id, first_name, last_name, grade_level, school_id')
      .single();

    if (error || !data) {
      res.status(500).json({ success: false, message: 'Failed to create student', error: error?.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: mapStudentRow(data),
    });
  } catch (error) {
    console.error('Create student error:', error);
    next(error);
  }
};

/**
 * Delete a student by ID
 * DELETE /api/students/:id
 */
export const deleteStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'Student ID is required' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      res.status(200).json({
        success: true,
        message: 'Student deleted (fallback mode)',
      });
      return;
    }

    const { error } = await client
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(500).json({ success: false, message: 'Failed to delete student', error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    next(error);
  }
};
