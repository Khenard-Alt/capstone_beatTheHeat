"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
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
 * GET /api/users/:id
 * Get user profile by ID
 */
router.get('/:id', userController_1.getUserProfile);
/**
 * DELETE /api/users/:id
 * Delete a user by ID
 */
router.delete('/:id', userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map