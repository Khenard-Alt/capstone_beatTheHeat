import type { StudentHealthIncident } from '../types';
import { apiClient } from './api';
import type { ApiEnvelope } from './api';

export interface IncidentRecord {
  id: string;
  schoolId?: string | null;
  reporterId?: string | null;
  reporterName?: string | null;
  reporterRole?: string | null;
  studentId?: string | null;
  studentName: string;
  gradeLevel?: string | null;
  section?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  incidentType: StudentHealthIncident['incidentType'];
  description?: string | null;
  severity?: StudentHealthIncident['severity'] | null;
  symptoms?: string[];
  heatIndex?: number | null;
  temperature?: number | null;
  timestamp: string;
  actionTaken?: string | null;
  aiSuggestion?: string | null;
  reportedBy?: string | null;
  status: StudentHealthIncident['status'] | string;
}

export const fetchIncidents = async (limit = 20, offset = 0): Promise<IncidentRecord[]> => {
  const { data } = await apiClient.get<ApiEnvelope<IncidentRecord[]>>('/api/incidents', {
    params: { limit, offset },
  });
  return data.data ?? [];
};

export const createIncident = async (payload: { schoolId?: string; reporterId?: string; studentId?: string; type: string; description: string; actionTaken?: string; heatIndex?: number }) => {
  const { data } = await apiClient.post<ApiEnvelope<any>>('/api/incidents', payload);
  return data.data;
};
