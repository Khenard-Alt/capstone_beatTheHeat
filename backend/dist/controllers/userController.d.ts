import { Request, Response, NextFunction } from 'express';
/**
 * Register a new user (parent or teacher)
 * POST /api/users/register
 */
export declare const registerUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Authenticate a user by email and password
 * POST /api/users/login
 */
export declare const loginUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Authenticate admin tools access via admin_auth table
 * POST /api/users/admin-auth
 */
export declare const authenticateAdminTools: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * List users, optionally filtered by role
 * GET /api/users?role=parent
 */
export declare const listUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get user profile by ID
 * GET /api/users/:id
 */
export declare const getUserProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Send OTP to email
 * POST /api/users/send-otp
 */
export declare const sendOTP: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify OTP code
 * POST /api/users/verify-otp
 */
export declare const verifyOTPCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check OTP verification status
 * GET /api/users/otp-status/:email
 */
export declare const getOTPStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete a user by ID
 * DELETE /api/users/:id
 */
export declare const deleteUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update user profile
 * PUT /api/users/:id
 */
export declare const updateUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get children/students linked to a parent user
 * GET /api/users/:id/children
 */
export declare const getUserChildren: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map