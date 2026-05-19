import express, { Router } from 'express';
import { registerUser, loginUser, authenticateAdminTools, listUsers, getUserProfile, sendOTP, verifyOTPCode, getOTPStatus, deleteUser } from '../controllers/userController';

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
 * GET /api/users/:id
 * Get user profile by ID
 */
router.get('/:id', getUserProfile);

/**
 * DELETE /api/users/:id
 * Delete a user by ID
 */
router.delete('/:id', deleteUser);

export default router;
