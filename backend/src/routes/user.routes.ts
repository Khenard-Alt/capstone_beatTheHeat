import express, { Router } from 'express';
import multer from 'multer';
import { registerUser, loginUser, logoutUser, syncOAuthUser, authenticateAdminTools, listUsers, getUserProfile, sendOTP, verifyOTPCode, getOTPStatus, deleteUser, updateUser, getUserChildren, uploadAvatar, avatarUpload, uploadIdProof, idProofUpload, changePassword, resetPasswordWithOTP, getPendingDeviceConfirmation, resolveDeviceConfirmation, getDeviceConfirmationStatus } from '../controllers/userController';

const router: Router = express.Router();

/**
 * POST /api/users/register
 * Register a new user (parent or teacher)
 */
router.post('/register', registerUser);

/**
 * POST /api/users/login
 * Authenticate a user and return their stored role
 */
router.post('/login', loginUser);

/**
 * POST /api/users/logout
 * Revoke the caller's own session so it doesn't block a future login
 */
router.post('/logout', logoutUser);

/**
 * GET /api/users/device-confirmation/pending?userId=
 * Check whether the logged-in device has a pending login-confirmation request
 */
router.get('/device-confirmation/pending', getPendingDeviceConfirmation);

/**
 * POST /api/users/device-confirmation/resolve
 * Approve or deny a pending login-confirmation request
 */
router.post('/device-confirmation/resolve', resolveDeviceConfirmation);

/**
 * GET /api/users/device-confirmation/status?sessionId=
 * Poll the status of a pending login-confirmation request
 */
router.get('/device-confirmation/status', getDeviceConfirmationStatus);

/**
 * POST /api/users/oauth/sync
 * Verify a Supabase OAuth session and sync its application user record.
 */
router.post('/oauth/sync', syncOAuthUser);

/**
 * POST /api/users/admin-auth
 * Authenticate admin management actions via admin_auth table
 */
router.post('/admin-auth', authenticateAdminTools);

/**
 * GET /api/users
 * List users, optionally filtered by role
 */
router.get('/', listUsers);

/**
 * POST /api/users/send-otp
 * Send OTP to email
 */
router.post('/send-otp', sendOTP);

/**
 * POST /api/users/verify-otp
 * Verify OTP code
 */
router.post('/verify-otp', verifyOTPCode);

/**
 * GET /api/users/otp-status/:email
 * Check OTP verification status
 */
router.get('/otp-status/:email', getOTPStatus);

/**
 * POST /api/users/reset-password
 * Reset a forgotten password using a verified email OTP
 */
router.post('/reset-password', resetPasswordWithOTP);

/**
 * GET /api/users/:id
 * Get user profile by ID
 */
router.get('/:id/children', getUserChildren);

router.get('/:id', getUserProfile);

/**
 * PUT /api/users/:id
 * Update user profile (name, phone, email change requires OTP verified)
 */
router.put('/:id', updateUser);

/**
 * POST /api/users/:id/avatar
 * Upload/replace a user's profile picture (multipart/form-data, field "avatar")
 */
router.post('/:id/avatar', (req, res, next) => {
	avatarUpload.single('avatar')(req, res, (error) => {
		if (error instanceof multer.MulterError) {
			res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3MB or smaller.' : error.message });
			return;
		}

		if (error) {
			res.status(400).json({ success: false, message: error.message || 'Invalid image upload.' });
			return;
		}

		next();
	});
}, uploadAvatar);

/**
 * POST /api/users/:id/id-proof
 * Upload a supporting ID photo for a pending parent-child verification request
 * (multipart/form-data, field "idProof", body also includes studentId)
 */
router.post('/:id/id-proof', (req, res, next) => {
	idProofUpload.single('idProof')(req, res, (error) => {
		if (error instanceof multer.MulterError) {
			res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller.' : error.message });
			return;
		}

		if (error) {
			res.status(400).json({ success: false, message: error.message || 'Invalid image upload.' });
			return;
		}

		next();
	});
}, uploadIdProof);

/**
 * PUT /api/users/:id/password
 * Change (or set, for Google-linked accounts) a user's password
 */
router.put('/:id/password', changePassword);

/**
 * DELETE /api/users/:id
 * Delete a user by ID
 */
router.delete('/:id', deleteUser);

export default router;
