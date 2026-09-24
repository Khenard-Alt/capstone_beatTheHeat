import { apiClient } from './api';

export interface PendingVerification {
  parentUserId: string;
  studentId: string;
  submittedStudentNumber: string | null;
  idPhotoUrl: string | null;
  requestedAt: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  studentName: string | null;
  gradeLevel: string | null;
  section: string | null;
  actualStudentNumber: string | null;
  studentNumberMatches: boolean;
}

export const fetchPendingVerifications = async (): Promise<PendingVerification[]> => {
  const { data } = await apiClient.get('/api/parent-verifications/pending');
  return data?.data ?? [];
};

export const approveVerification = async (parentUserId: string, studentId: string, reviewedBy?: string): Promise<void> => {
  await apiClient.post(`/api/parent-verifications/${parentUserId}/${studentId}/approve`, { reviewedBy });
};

export const rejectVerification = async (
  parentUserId: string,
  studentId: string,
  reviewedBy?: string,
  reason?: string
): Promise<void> => {
  await apiClient.post(`/api/parent-verifications/${parentUserId}/${studentId}/reject`, { reviewedBy, reason });
};
