import type { StudentHealthIncident } from '../types';
import { apiClient } from './api';
import type { ApiEnvelope } from './api';

interface BackendIncident {
  id: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  incidentType: StudentHealthIncident['incidentType'];
  severity: StudentHealthIncident['severity'];
  symptoms: string[];
  heatIndex: number;
  temperature: number;
  timestamp: string;
  actionTaken: string;
  reportedBy: string;
  status: StudentHealthIncident['status'];
}

export const fetchIncidents = async (limit = 20, offset = 0): Promise<StudentHealthIncident[]> => {
  const { data } = await apiClient.get<ApiEnvelope<BackendIncident[]>>('/api/incidents', {
    params: { limit, offset },
  });
  return data.data ?? [];
};
