/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: min 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
};

/**
 * Get password strength level
 */
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 6) return 'weak';
  if (password.length < 8) return 'medium';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strengthScore = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (strengthScore >= 3 && password.length >= 10) return 'strong';
  if (strengthScore >= 2) return 'medium';
  return 'weak';
};

/**
 * Validate phone number (Philippine format)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+63|0)?9\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Validate required field
 */
export const isRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate minimum length
 */
export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

/**
 * Validate maximum length
 */
export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

/**
 * Validate numeric value
 */
export const isNumeric = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};

/**
 * Validate value is within range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate temperature value
 */
export const isValidTemperature = (temp: number): boolean => {
  return isInRange(temp, -50, 60); // Celsius
};

/**
 * Validate humidity value
 */
export const isValidHumidity = (humidity: number): boolean => {
  return isInRange(humidity, 0, 100);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate date is not in the future
 */
export const isNotFutureDate = (date: string | Date): boolean => {
  const inputDate = new Date(date);
  const now = new Date();
  return inputDate <= now;
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate form data
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateForm = (data: Record<string, any>, rules: Record<string, any>): ValidationResult => {
  const errors: Record<string, string> = {};
  
  Object.keys(rules).forEach((field) => {
    const value = data[field];
    const fieldRules = rules[field];
    
    if (fieldRules.required && !isRequired(value)) {
      errors[field] = `${field} is required`;
    }
    
    if (fieldRules.email && !isValidEmail(value)) {
      errors[field] = 'Invalid email format';
    }
    
    if (fieldRules.password && !isValidPassword(value)) {
      errors[field] = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }
    
    if (fieldRules.minLength && !minLength(value, fieldRules.minLength)) {
      errors[field] = `Must be at least ${fieldRules.minLength} characters`;
    }
    
    if (fieldRules.maxLength && !maxLength(value, fieldRules.maxLength)) {
      errors[field] = `Must not exceed ${fieldRules.maxLength} characters`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
