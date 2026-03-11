import { HeatLevel } from '../types';
import { HEAT_THRESHOLDS, HEAT_COLORS, HEAT_LABELS } from './constants';

/**
 * Calculate heat index from temperature and humidity
 * Using simplified Steadman formula
 */
export const calculateHeatIndex = (tempCelsius: number, humidity: number): number => {
  // Convert to Fahrenheit for calculation
  const tempF = (tempCelsius * 9) / 5 + 32;
  const rh = humidity;

  // Simplified heat index formula
  let hi =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * rh -
    0.22475541 * tempF * rh -
    6.83783e-3 * tempF * tempF -
    5.481717e-2 * rh * rh +
    1.22874e-3 * tempF * tempF * rh +
    8.5282e-4 * tempF * rh * rh -
    1.99e-6 * tempF * tempF * rh * rh;

  // Convert back to Celsius
  const hiCelsius = ((hi - 32) * 5) / 9;

  return Math.round(hiCelsius * 10) / 10; // Round to 1 decimal
};

/**
 * Determine heat level based on heat index value
 */
export const getHeatLevel = (heatIndex: number): HeatLevel => {
  if (heatIndex >= HEAT_THRESHOLDS.DANGER) return 'extreme-danger';
  if (heatIndex >= HEAT_THRESHOLDS.EXTREME_CAUTION) return 'danger';
  if (heatIndex >= HEAT_THRESHOLDS.CAUTION) return 'extreme-caution';
  if (heatIndex >= HEAT_THRESHOLDS.NORMAL) return 'caution';
  return 'normal';
};

/**
 * Get color based on heat level
 */
export const getHeatColor = (level: HeatLevel): string => {
  return HEAT_COLORS[level];
};

/**
 * Get label based on heat level
 */
export const getHeatLabel = (level: HeatLevel): string => {
  return HEAT_LABELS[level];
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Generate a random ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Check if user has permission
 */
export const hasPermission = (userRole: string, requiredRole: string[]): boolean => {
  return requiredRole.includes(userRole);
};

/**
 * Get greeting based on time of day
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Convert Celsius to Fahrenheit
 */
export const celsiusToFahrenheit = (celsius: number): number => {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
};

/**
 * Download data as JSON file
 */
export const downloadJSON = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Get time ago string
 */
export const getTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
};
