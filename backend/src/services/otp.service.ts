interface OTPRecord {
  code: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

// In-memory OTP storage (in production, use Redis or database)
const otpStorage = new Map<string, OTPRecord>();

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generate a random 6-digit OTP code
 */
export const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create and store OTP for email
 */
export const createOTP = (email: string): { code: string; expiresIn: number } => {
  const code = generateOTPCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  otpStorage.set(email, {
    code,
    email,
    createdAt: now,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  console.log(`[OTP] Generated OTP for ${email}: ${code}`); // Debug log

  return {
    code,
    expiresIn: OTP_EXPIRY_MINUTES * 60, // in seconds
  };
};

/**
 * Verify OTP code for email
 */
export const verifyOTP = (email: string, code: string): { valid: boolean; message: string } => {
  const record = otpStorage.get(email);

  if (!record) {
    return { valid: false, message: 'No OTP found for this email' };
  }

  if (record.verified) {
    return { valid: false, message: 'OTP already verified' };
  }

  if (new Date() > record.expiresAt) {
    otpStorage.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStorage.delete(email);
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  record.attempts += 1;

  if (record.code !== code) {
    return { valid: false, message: `Invalid OTP. ${MAX_ATTEMPTS - record.attempts} attempts remaining.` };
  }

  // Mark as verified
  record.verified = true;
  console.log(`[OTP] OTP verified for ${email}`);

  return { valid: true, message: 'OTP verified successfully' };
};

/**
 * Check if OTP is verified
 */
export const isOTPVerified = (email: string): boolean => {
  const record = otpStorage.get(email);
  return record ? record.verified : false;
};

/**
 * Clear OTP after registration
 */
export const clearOTP = (email: string): void => {
  otpStorage.delete(email);
  console.log(`[OTP] Cleared OTP for ${email}`);
};

/**
 * Get remaining expiry time in seconds
 */
export const getOTPExpiryTime = (email: string): number => {
  const record = otpStorage.get(email);
  if (!record) return 0;

  const remaining = Math.max(0, Math.floor((record.expiresAt.getTime() - new Date().getTime()) / 1000));
  return remaining;
};
