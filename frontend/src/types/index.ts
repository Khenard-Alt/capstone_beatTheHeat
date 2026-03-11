// User Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'staff';
  firstName: string;
  lastName: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

// School Types
export interface School {
  id: string;
  name: string;
  address: string;
  contact: string;
  latitude: number;
  longitude: number;
  heatThresholds: HeatThresholds;
  createdAt: string;
}

export interface HeatThresholds {
  normal: number;
  caution: number;
  extremeCaution: number;
  danger: number;
  extremeDanger: number;
}

// Weather Types
export interface WeatherData {
  id: string;
  schoolId: string;
  temperature: number;
  humidity: number;
  feelsLike: number;
  conditions: string;
  icon: string;
  windSpeed: number;
  pressure: number;
  timestamp: string;
}

// Heat Index Types
export interface HeatIndexData {
  id: string;
  schoolId: string;
  temperature: number;
  humidity: number;
  heatIndex: number;
  level: HeatLevel;
  timestamp: string;
}

export type HeatLevel = 'normal' | 'caution' | 'extreme-caution' | 'danger' | 'extreme-danger';

export interface HeatIndexHistory {
  date: string;
  avgHeatIndex: number;
  maxHeatIndex: number;
  minHeatIndex: number;
  level: HeatLevel;
}

// Health Advisory Types
export interface HealthAdvisory {
  id: string;
  schoolId: string;
  heatLevel: HeatLevel;
  title: string;
  advisoryText: string;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  createdBy?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'heat-alert' | 'advisory' | 'system' | 'info';
  title: string;
  message: string;
  status: 'unread' | 'read';
  priority: 'low' | 'medium' | 'high';
  sentAt: string;
  readAt?: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'staff';
}

export interface AuthResponse {
  user: User;
  token: string;
}

// User Preferences Types
export interface UserPreferences {
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'fil';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chart Data Types
export interface ChartDataPoint {
  time: string;
  value: number;
  label?: string;
}

export interface HeatIndexChartData {
  temperature: ChartDataPoint[];
  humidity: ChartDataPoint[];
  heatIndex: ChartDataPoint[];
}

// Student Health Incident Types
export interface StudentHealthIncident {
  id: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  incidentType: 'heat-exhaustion' | 'asthma-attack' | 'dehydration' | 'dizziness' | 'nausea' | 'headache' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  symptoms: string[];
  heatIndex: number;
  temperature: number;
  timestamp: string;
  actionTaken: string;
  reportedBy: string;
  status: 'reported' | 'treated' | 'monitoring' | 'resolved';
}

export interface StudentHealthStats {
  totalIncidents: number;
  todayIncidents: number;
  weekIncidents: number;
  criticalCases: number;
  commonSymptoms: { symptom: string; count: number }[];
}
