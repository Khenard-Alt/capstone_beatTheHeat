import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

/**
 * List pending parent-child link requests for the review queue.
 * GET /api/parent-verifications/pending
 */
export const listPendingVerifications = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const { data: rows, error } = await client
      .from('parent_student_guardians')
      .select('parent_user_id, student_id, submitted_student_number, id_photo_url, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch pending verifications', error: error.message });
      return;
    }

    const rowsList = rows || [];
    const parentIds = Array.from(new Set(rowsList.map((r) => r.parent_user_id)));
    const studentIds = Array.from(new Set(rowsList.map((r) => r.student_id)));

    const parentsById: Record<string, any> = {};
    const studentsById: Record<string, any> = {};

    if (parentIds.length > 0) {
      const { data: parents } = await client.from('users').select('id, first_name, last_name, email, phone').in('id', parentIds);
      (parents || []).forEach((p: any) => { parentsById[p.id] = p; });
    }

    if (studentIds.length > 0) {
      const { data: students } = await client.from('students').select('id, first_name, last_name, grade_level, section, student_number').in('id', studentIds);
      (students || []).forEach((s: any) => { studentsById[s.id] = s; });
    }

    const mapped = rowsList.map((row) => {
      const parent = parentsById[row.parent_user_id];
      const student = studentsById[row.student_id];
      return {
        parentUserId: row.parent_user_id,
        studentId: row.student_id,
        submittedStudentNumber: row.submitted_student_number,
        idPhotoUrl: row.id_photo_url,
        requestedAt: row.created_at,
        parentName: parent ? `${parent.first_name} ${parent.last_name}`.trim() : null,
        parentEmail: parent?.email || null,
        parentPhone: parent?.phone || null,
        studentName: student ? `${student.first_name} ${student.last_name}`.trim() : null,
        gradeLevel: student?.grade_level || null,
        section: student?.section || null,
        actualStudentNumber: student?.student_number || null,
        studentNumberMatches: student?.student_number
          ? String(student.student_number).trim().toLowerCase() === String(row.submitted_student_number || '').trim().toLowerCase()
          : false,
      };
    });

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error('List pending verifications error:', error);
    next(error);
  }
};

/**
 * Approve a pending parent-child link — this is the point where the child
 * actually becomes visible to the parent (students.parent_user_id is only
 * set here, never at registration time).
 * POST /api/parent-verifications/:parentUserId/:studentId/approve
 */
export const approveVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { parentUserId, studentId } = req.params;
    const { reviewedBy } = req.body;

    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(503).json({ success: false, message: 'Approval requires database configuration.' });
      return;
    }

    const { error: studentUpdateError } = await client
      .from('students')
      .update({ parent_user_id: parentUserId })
      .eq('id', studentId);

    if (studentUpdateError) {
      res.status(500).json({ success: false, message: 'Failed to link student', error: studentUpdateError.message });
      return;
    }

    const { error: guardianUpdateError } = await client
      .from('parent_student_guardians')
      .update({
        status: 'approved',
        reviewed_by: typeof reviewedBy === 'string' && reviewedBy ? reviewedBy : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('parent_user_id', parentUserId)
      .eq('student_id', studentId);

    if (guardianUpdateError) {
      res.status(500).json({ success: false, message: 'Failed to update verification record', error: guardianUpdateError.message });
      return;
    }

    res.status(200).json({ success: true, message: 'Parent-child link approved' });
  } catch (error) {
    console.error('Approve verification error:', error);
    next(error);
  }
};

/**
 * Reject a pending parent-child link — students.parent_user_id is never
 * touched, so the child stays unlinked and searchable for a future
 * (legitimate) claim.
 * POST /api/parent-verifications/:parentUserId/:studentId/reject
 */
export const rejectVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { parentUserId, studentId } = req.params;
    const { reviewedBy, reason } = req.body;

    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(503).json({ success: false, message: 'Rejection requires database configuration.' });
      return;
    }

    const { error } = await client
      .from('parent_student_guardians')
      .update({
        status: 'rejected',
        reviewed_by: typeof reviewedBy === 'string' && reviewedBy ? reviewedBy : null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
      })
      .eq('parent_user_id', parentUserId)
      .eq('student_id', studentId);

    if (error) {
      res.status(500).json({ success: false, message: 'Failed to reject request', error: error.message });
      return;
    }

    res.status(200).json({ success: true, message: 'Parent-child link rejected' });
  } catch (error) {
    console.error('Reject verification error:', error);
    next(error);
  }
};
