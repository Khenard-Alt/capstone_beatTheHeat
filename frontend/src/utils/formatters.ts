import { format, parseISO } from 'date-fns';
import { DATE_FORMATS } from './constants';

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date, formatStr: string = DATE_FORMATS.FULL): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
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
