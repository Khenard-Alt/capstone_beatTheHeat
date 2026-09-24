"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
/**
 * POST /api/users/register
 * Register a new user (parent or teacher)
 */
router.post('/register', userController_1.registerUser);
/**
 * POST /api/users/login
 * Authenticate a user and return their stored role
 */
router.post('/login', userController_1.loginUser);
/**
 * POST /api/users/logout
 * Revoke the caller's own session so it doesn't block a future login
 */
router.post('/logout', userController_1.logoutUser);
/**
 * GET /api/users/device-confirmation/pending?userId=
 * Check whether the logged-in device has a pending login-confirmation request
 */
router.get('/device-confirmation/pending', userController_1.getPendingDeviceConfirmation);
/**
 * POST /api/users/device-confirmation/resolve
 * Approve or deny a pending login-confirmation request
 */
router.post('/device-confirmation/resolve', userController_1.resolveDeviceConfirmation);
/**
 * GET /api/users/device-confirmation/status?sessionId=
 * Poll the status of a pending login-confirmation request
 */
router.get('/device-confirmation/status', userController_1.getDeviceConfirmationStatus);
/**
 * POST /api/users/oauth/sync
 * Verify a Supabase OAuth session and sync its application user record.
 */
router.post('/oauth/sync', userController_1.syncOAuthUser);
/**
 * POST /api/users/admin-auth
 * Authenticate admin management actions via admin_auth table
 */
router.post('/admin-auth', userController_1.authenticateAdminTools);
/**
 * GET /api/users
 * List users, optionally filtered by role
 */
router.get('/', userController_1.listUsers);
/**
 * POST /api/users/send-otp
 * Send OTP to email
 */
router.post('/send-otp', userController_1.sendOTP);
/**
 * POST /api/users/verify-otp
 * Verify OTP code
 */
router.post('/verify-otp', userController_1.verifyOTPCode);
/**
 * GET /api/users/otp-status/:email
 * Check OTP verification status
 */
router.get('/otp-status/:email', userController_1.getOTPStatus);
/**
 * POST /api/users/reset-password
 * Reset a forgotten password using a verified email OTP
 */
router.post('/reset-password', userController_1.resetPasswordWithOTP);
/**
 * GET /api/users/:id
 * Get user profile by ID
 */
router.get('/:id/children', userController_1.getUserChildren);
router.get('/:id', userController_1.getUserProfile);
/**
 * PUT /api/users/:id
 * Update user profile (name, phone, email change requires OTP verified)
 */
router.put('/:id', userController_1.updateUser);
/**
 * POST /api/users/:id/avatar
 * Upload/replace a user's profile picture (multipart/form-data, field "avatar")
 */
router.post('/:id/avatar', (req, res, next) => {
    userController_1.avatarUpload.single('avatar')(req, res, (error) => {
        if (error instanceof multer_1.default.MulterError) {
            res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3MB or smaller.' : error.message });
            return;
        }
        if (error) {
            res.status(400).json({ success: false, message: error.message || 'Invalid image upload.' });
            return;
        }
        next();
    });
}, userController_1.uploadAvatar);
/**
 * POST /api/users/:id/id-proof
 * Upload a supporting ID photo for a pending parent-child verification request
 * (multipart/form-data, field "idProof", body also includes studentId)
 */
router.post('/:id/id-proof', (req, res, next) => {
    userController_1.idProofUpload.single('idProof')(req, res, (error) => {
        if (error instanceof multer_1.default.MulterError) {
            res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller.' : error.message });
            return;
        }
        if (error) {
            res.status(400).json({ success: false, message: error.message || 'Invalid image upload.' });
            return;
        }
        next();
    });
}, userController_1.uploadIdProof);
/**
 * PUT /api/users/:id/password
 * Change (or set, for Google-linked accounts) a user's password
 */
router.put('/:id/password', userController_1.changePassword);
/**
 * DELETE /api/users/:id
 * Delete a user by ID
 */
router.delete('/:id', userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map