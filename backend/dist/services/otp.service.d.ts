/**
 * Generate a random 6-digit OTP code
 */
export declare const generateOTPCode: () => string;
/**
 * Create and store OTP for email
 */
export declare const createOTP: (email: string) => {
    code: string;
    expiresIn: number;
};
/**
 * Verify OTP code for email
 */
export declare const verifyOTP: (email: string, code: string) => {
    valid: boolean;
    message: string;
};
/**
 * Check if OTP is verified
 */
export declare const isOTPVerified: (email: string) => boolean;
/**
 * Clear OTP after registration
 */
export declare const clearOTP: (email: string) => void;
/**
 * Get remaining expiry time in seconds
 */
export declare const getOTPExpiryTime: (email: string) => number;
//# sourceMappingURL=otp.service.d.ts.map