"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOTPExpiryTime = exports.clearOTP = exports.isOTPVerified = exports.verifyOTP = exports.createOTP = exports.generateOTPCode = void 0;
// In-memory OTP storage (in production, use Redis or database)
const otpStorage = new Map();
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/**
 * Generate a random 6-digit OTP code
 */
const generateOTPCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTPCode = generateOTPCode;
/**
 * Create and store OTP for email
 */
const createOTP = (email) => {
    const code = (0, exports.generateOTPCode)();
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
exports.createOTP = createOTP;
/**
 * Verify OTP code for email
 */
const verifyOTP = (email, code) => {
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
exports.verifyOTP = verifyOTP;
/**
 * Check if OTP is verified
 */
const isOTPVerified = (email) => {
    const record = otpStorage.get(email);
    return record ? record.verified : false;
};
exports.isOTPVerified = isOTPVerified;
/**
 * Clear OTP after registration
 */
const clearOTP = (email) => {
    otpStorage.delete(email);
    console.log(`[OTP] Cleared OTP for ${email}`);
};
exports.clearOTP = clearOTP;
/**
 * Get remaining expiry time in seconds
 */
const getOTPExpiryTime = (email) => {
    const record = otpStorage.get(email);
    if (!record)
        return 0;
    const remaining = Math.max(0, Math.floor((record.expiresAt.getTime() - new Date().getTime()) / 1000));
    return remaining;
};
exports.getOTPExpiryTime = getOTPExpiryTime;
//# sourceMappingURL=otp.service.js.map