// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
export const API_TIMEOUT = 10000; // 10 seconds

// Heat Index Levels
export const HEAT_LEVELS = {
  NORMAL: 'normal',
  CAUTION: 'caution',
  EXTREME_CAUTION: 'extreme-caution',
  DANGER: 'danger',
  EXTREME_DANGER: 'extreme-danger',
} as const;

// Heat Index Thresholds (in Celsius)
export const HEAT_THRESHOLDS = {
  NORMAL: 27,
  CAUTION: 32,
  EXTREME_CAUTION: 41,
  DANGER: 54,
};

// Heat Index Colors
export const HEAT_COLORS = {
  normal: '#10b981', // green
  caution: '#fbbf24', // yellow
  'extreme-caution': '#f97316', // orange
  danger: '#ef4444', // red
  'extreme-danger': '#991b1b', // dark red
};

// Heat Index Labels
export const HEAT_LABELS = {
  normal: 'Normal',
  caution: 'Caution',
  'extreme-caution': 'Extreme Caution',
  danger: 'Danger',
  'extreme-danger': 'Extreme Danger',
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  HEAD_TEACHER: 'head-teacher',
  TEACHER: 'teacher',
  STAFF: 'staff',
  PARENT: 'parent',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  HEAT_ALERT: 'heat-alert',
  ADVISORY: 'advisory',
  SYSTEM: 'system',
  INFO: 'info',
} as const;

// Date Formats
export const DATE_FORMATS = {
  FULL: 'MMMM dd, yyyy HH:mm:ss',
  DATE_ONLY: 'MMMM dd, yyyy',
  TIME_ONLY: 'HH:mm:ss',
  SHORT: 'MMM dd, yyyy',
  SHORT_TIME: 'MMM dd, HH:mm',
};

// Chart Configuration
export const CHART_COLORS = {
  temperature: '#ef4444',
  humidity: '#3b82f6',
  heatIndex: '#f97316',
  normal: '#10b981',
};

// Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  WEATHER_DATA: 15 * 60 * 1000, // 15 minutes
  HEAT_INDEX: 5 * 60 * 1000, // 5 minutes
  NOTIFICATIONS: 60 * 1000, // 1 minute
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  PREFERENCES: 'user_preferences',
};

// Weather Condition Icons
export const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', // clear sky day
  '01n': '🌙', // clear sky night
  '02d': '⛅', // few clouds day
  '02n': '☁️', // few clouds night
  '03d': '☁️', // scattered clouds
  '03n': '☁️',
  '04d': '☁️', // broken clouds
  '04n': '☁️',
  '09d': '🌧️', // shower rain
  '09n': '🌧️',
  '10d': '🌦️', // rain day
  '10n': '🌧️',
  '11d': '⛈️', // thunderstorm
  '11n': '⛈️',
  '13d': '❄️', // snow
  '13n': '❄️',
  '50d': '🌫️', // mist
  '50n': '🌫️',
};

// School Information
export const SCHOOL_INFO = {
  NAME: 'Mayamot Elementary School',
  ADDRESS: 'Mayamot, Antipolo City, Rizal',
  CONTACT: '+63 (02) 8234-5678',
  EMAIL: 'mayamot.es@deped.gov.ph',
};

// DepEd Heat Index Recommendations
export const DEPED_RECOMMENDATIONS = {
  normal: [
    'Continue normal outdoor activities',
    'Stay hydrated throughout the day',
    'Monitor weather conditions regularly',
  ],
  caution: [
    'Limit strenuous outdoor activities',
    'Provide frequent water breaks',
    'Watch for signs of heat exhaustion',
    'Schedule outdoor activities during cooler hours',
  ],
  'extreme-caution': [
    'Minimize outdoor activities',
    'Mandatory water breaks every 15-20 minutes',
    'Move activities to shaded or indoor areas',
    'Monitor students closely for heat-related symptoms',
    'Have cooling stations available',
  ],
  danger: [
    'Cancel all outdoor activities',
    'Keep students indoors in air-conditioned rooms',
    'Ensure constant hydration',
    'Monitor all individuals for heat stroke symptoms',
    'Have emergency medical supplies ready',
  ],
  'extreme-danger': [
    'EMERGENCY: Suspend all outdoor activities immediately',
    'Keep everyone in air-conditioned spaces',
    'Continuous monitoring for heat stroke',
    'Prepare for possible early dismissal',
    'Alert emergency medical services',
  ],
};

// The backend labels the safest tier "safe"; the rest of the frontend already
// keys everything (HEAT_LABELS, HEAT_COLORS, DEPED_RECOMMENDATIONS) off "normal".
export const normalizeHeatLevel = (level?: string | null): keyof typeof HEAT_LABELS => {
  const value = (level || '').toLowerCase();
  if (value === 'safe') return 'normal';
  if (value in HEAT_LABELS) return value as keyof typeof HEAT_LABELS;
  return 'normal';
};

// Role-specific preventive/recommended actions per heat level, for predictive
// reports. Kept alongside DEPED_RECOMMENDATIONS (which is level-only, generic).
export const ROLE_HEAT_RECOMMENDATIONS: Record<keyof typeof HEAT_LABELS, Record<'principal' | 'head-teacher' | 'teacher' | 'parent' | 'admin', string[]>> = {
  normal: {
    principal: ['No operational changes needed.', 'Confirm the weather monitoring feed is updating normally.'],
    'head-teacher': ['Proceed with the regular class and activity schedule.', 'Spot-check that classrooms have drinking water available.'],
    teacher: ['Continue normal outdoor activities.', 'Remind students to hydrate throughout the day.'],
    parent: ['No special precautions needed today.', 'Pack a reusable water bottle as usual.'],
    admin: ['No system alerts required.', 'Continue routine weather snapshot logging.'],
  },
  caution: {
    principal: ['Notify head teachers to watch outdoor activity duration.', 'Confirm water stations are stocked school-wide.'],
    'head-teacher': ['Coordinate shaded breaks for outdoor classes.', 'Ask teachers to report any early symptoms immediately.'],
    teacher: ['Limit strenuous outdoor activities.', 'Provide frequent water breaks.', 'Watch for early signs of heat exhaustion.'],
    parent: ['Send your child with extra water.', 'Ask about symptoms like dizziness or headache after school.'],
    admin: ['Verify the caution-level advisory was sent to affected roles.', 'Monitor the heat index feed for further increases.'],
  },
  'extreme-caution': {
    principal: ['Consider moving PE and recess to shaded or indoor areas.', 'Brief head teachers on possible activity adjustments.'],
    'head-teacher': ['Move outdoor activities to shaded or indoor areas.', 'Set mandatory water breaks every 15-20 minutes.'],
    teacher: ['Minimize outdoor activities.', 'Enforce water breaks every 15-20 minutes.', 'Monitor students closely for symptoms.'],
    parent: ['Remind your child to drink water often.', 'Watch for signs of heat exhaustion after school hours.'],
    admin: ['Confirm cooling stations/fans are operational campus-wide.', 'Escalate repeated symptom reports to the clinic.'],
  },
  danger: {
    principal: ['Cancel outdoor activities and move classes indoors.', 'Prepare a possible schedule adjustment announcement.'],
    'head-teacher': ['Direct all classes to remain indoors in cooled rooms.', 'Coordinate clinic readiness for heat-related cases.'],
    teacher: ['Cancel all outdoor activities.', 'Keep students indoors in air-conditioned rooms.', 'Monitor for heat stroke symptoms.'],
    parent: ['Expect indoor-only activities today.', 'Watch closely for heat stroke symptoms at pickup.'],
    admin: ['Push a danger-level alert to all roles immediately.', 'Confirm emergency medical supplies are ready.'],
  },
  'extreme-danger': {
    principal: ['Evaluate early dismissal or class suspension.', 'Alert DepEd leadership and coordinate an official announcement.'],
    'head-teacher': ['Suspend all outdoor activities immediately.', 'Prepare for possible early dismissal.'],
    teacher: ['Suspend all outdoor activities immediately.', 'Continuously monitor students for heat stroke.'],
    parent: ['Be ready for a possible early dismissal notice.', 'Keep your phone reachable for school alerts.'],
    admin: ['Alert emergency medical services.', 'Escalate to school and DepEd leadership without delay.'],
  },
};
