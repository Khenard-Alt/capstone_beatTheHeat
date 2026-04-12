import { format, parseISO } from 'date-fns';
import { DATE_FORMATS } from './constants';

const toDateSafe = (input: string | Date): Date | null => {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  const parsed = parseISO(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(input);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date, formatStr: string = DATE_FORMATS.FULL): string => {
  try {
    const dateObj = toDateSafe(date);
    if (!dateObj) {
      return 'Invalid date';
    }

    return format(dateObj, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Standard global datetime format requested by UI.
 * Example: Mar-24-2026 05-01-39 AM
 */
export const formatDateTimeGlobal = (date: string | Date): string => {
  return formatDate(date, 'MMM-dd-yyyy hh-mm-ss a');
};

/**
 * Compact chart axis format for readability.
 * Example: Mar-24 05:01 AM
 */
export const formatDateTimeCompact = (date: string | Date): string => {
  return formatDate(date, 'MMM-dd hh:mm a');
};

/**
 * Format temperature with unit
 */
export const formatTemperature = (temp: number, unit: 'C' | 'F' = 'C'): string => {
  return `${temp.toFixed(1)}°${unit}`;
};

/**
 * Format humidity percentage
 */
export const formatHumidity = (humidity: number): string => {
  return `${humidity.toFixed(0)}%`;
};

/**
 * Format wind speed
 */
export const formatWindSpeed = (speed: number, unit: 'kph' | 'mph' = 'kph'): string => {
  return `${speed.toFixed(1)} ${unit}`;
};

/**
 * Format pressure
 */
export const formatPressure = (pressure: number): string => {
  return `${pressure.toFixed(0)} hPa`;
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return phone;
};

/**
 * Format user's full name
 */
export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

/**
 * Format time duration
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};
