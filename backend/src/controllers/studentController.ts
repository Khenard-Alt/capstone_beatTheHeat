import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

const fallbackStudents = [
  { id: 's1', name: 'Juan Dela Cruz', grade: 'Grade 3', section: 'Rose', schoolId: 'school-1' },
  { id: 's2', name: 'Maria Santos', grade: 'Grade 5', section: 'Jasmine', schoolId: 'school-1' },
  { id: 's3', name: 'Carlos Reyes', grade: 'Grade 4', section: 'Lily', schoolId: 'school-1' },
];

const mapStudentRow = (student: {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  section?: string | null;
  school_id: string;
}) => ({
  id: student.id,
  name: `${student.first_name} ${student.last_name}`,
  grade: student.grade_level ?? undefined,
  section: student.section ?? undefined,
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

const normalizeStudentSearch = (value: string) => value.toLowerCase().trim();

const matchesStudentQuery = (student: { name: string; grade?: string; section?: string }, query: string) => {
  const haystack = [student.name, student.grade, student.section]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

/**
 * Get students for parent child dropdown and admin listings
 * GET /api/students
 */
export const getStudents = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const unassignedOnly = String(req.query.unassignedOnly).toLowerCase() === 'true';
    const client = getSupabaseAdminClient();

    if (!client) {
      res.status(200).json({
        success: true,
        message: 'Serving fallback student list',
        students: fallbackStudents,
      });
      return;
    }

    let query = client
      .from('students')
      .select('id, first_name, last_name, grade_level, section, school_id, parent_user_id, status')
      .eq('status', 'active')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;

    if (unassignedOnly) {
      query = query.is('parent_user_id', null);
    }

    if (parentId) {
      query = query.eq('parent_user_id', parentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      res.status(200).json({
        success: true,
        message: 'Serving fallback student list',
        students: fallbackStudents,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: unassignedOnly ? 'Students without parents' : 'Students',
      students: (data ?? []).map(mapStudentRow),
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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

    const query = normalizeStudentSearch(q);

    const client = getSupabaseAdminClient();

    if (!client) {
      const results = fallbackStudents.filter((student) =>
        matchesStudentQuery(student, query)
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
      .select('id, first_name, last_name, grade_level, section, school_id');

    if (error) {
      console.warn('Student search query failed, using fallback data:', error);
      const results = fallbackStudents.filter((student) =>
        matchesStudentQuery(student, query)
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
      .filter((student) => matchesStudentQuery(student, query));

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
      .select('id, first_name, last_name, grade_level, section, school_id')
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
