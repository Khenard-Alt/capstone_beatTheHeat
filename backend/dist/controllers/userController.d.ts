import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const avatarUpload: multer.Multer;
export declare const idProofUpload: multer.Multer;
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
 * Sync a Supabase Google session into the application's users table.
 * New OAuth users are created as parents until an administrator assigns another role.
 */
export declare const syncOAuthUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
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
 * Upload/replace a user's profile picture
 * POST /api/users/:id/avatar  (multipart/form-data, field name "avatar")
 */
export declare const uploadAvatar: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Upload a supporting ID photo for a pending parent-child verification
 * request. Purely supplementary evidence for the admin/head-teacher
 * reviewer — the student-number check at registration is the actual gate,
 * since a photo alone can be faked with image editing tools.
 * POST /api/users/:id/id-proof  (multipart/form-data, field name "idProof")
 */
export declare const uploadIdProof: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Change (or, for Google-linked accounts, set) a user's password.
 * PUT /api/users/:id/password
 */
export declare const changePassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reset a forgotten password using a verified email OTP — unlike
 * changePassword, this doesn't require knowing the current password or the
 * user's internal id, since the whole point is the caller is locked out.
 * POST /api/users/reset-password
 */
export declare const resetPasswordWithOTP: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get children/students linked to a parent user
 * GET /api/users/:id/children
 */
export declare const getUserChildren: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check whether the currently logged-in device has a pending login-confirmation
 * request from another device attempting to sign into the same account.
 * The caller must present the token of the account's currently-active
 * session — otherwise anyone who merely knows a userId could read (and, via
 * /resolve, act on) another account's pending login.
 * GET /api/users/device-confirmation/pending?userId=&token=
 */
export declare const getPendingDeviceConfirmation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Approve or deny a pending login-confirmation request from the device that
 * is already logged in. `token` must be that device's own active-session
 * token — this is what stops the device attempting the new login from
 * approving its own request.
 * POST /api/users/device-confirmation/resolve
 */
export declare const resolveDeviceConfirmation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Poll the status of a pending login-confirmation request from the new
 * device that is waiting to be let in.
 * GET /api/users/device-confirmation/status?sessionId=
 */
export declare const getDeviceConfirmationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Revoke the caller's own session on logout, so a later login from a
 * different device doesn't get stuck waiting for approval from a device
 * whose user already signed out.
 * POST /api/users/logout
 */
export declare const logoutUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map