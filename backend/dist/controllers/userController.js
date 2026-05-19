"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.deleteUser = exports.getOTPStatus = exports.verifyOTPCode = exports.sendOTP = exports.getUserProfile = exports.listUsers = exports.authenticateAdminTools = exports.loginUser = exports.registerUser = void 0;
const supabase_1 = require("../config/supabase");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const otp_service_1 = require("../services/otp.service");
const email_service_1 = require("../services/email.service"); // eslint-disable-line @typescript-eslint/no-unused-vars
const allowedRoles = ['admin', 'principal', 'head-teacher', 'teacher', 'staff', 'parent'];
const isAllowedRole = (role) => typeof role === 'string' && allowedRoles.includes(role);
const fallbackUser = (email, role) => ({
    id: crypto_1.default.randomUUID(),
    email,
    role,
    firstName: 'User',
    lastName: 'Demo',
    schoolId: 'school-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});
const fallbackUsers = [
    fallbackUser('admin@beattheheat.local', 'admin'),
    fallbackUser('parent@beattheheat.local', 'parent'),
    fallbackUser('teacher@beattheheat.local', 'teacher'),
];
const sanitizeUserRow = (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    schoolId: user.school_id,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
});
const mapUserRow = (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    schoolId: user.school_id,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
});
/**
 * Register a new user (parent or teacher)
 * POST /api/users/register
 */
const registerUser = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role, phone, childId, idProofUrl } = req.body;
        // Validate required fields
        if (!email || !password || !firstName || !lastName || !role) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }
        if (!isAllowedRole(role)) {
            res.status(400).json({
                success: false,
                message: 'Invalid role. Allowed roles are admin, principal, head-teacher, teacher, staff, and parent.',
            });
            return;
        }
        const client = (0, supabase_1.getSupabaseAdminClient)();
        // If no database, return mock user
        if (!client) {
            const mockUser = fallbackUser(email, role);
            res.status(201).json({
                success: true,
                message: 'User registered (fallback mode)',
                user: mockUser,
            });
            return;
        }
        // Check if user already exists
        const { data: existingUser, error: checkError } = await client
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        if (existingUser) {
            res.status(409).json({ success: false, message: 'Email already registered' });
            return;
        }
        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 = no rows returned (which is expected)
            console.error('Check user error:', checkError);
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Insert new user
        const { data: newUser, error: insertError } = await client
            .from('users')
            .insert([
            {
                email,
                password_hash: hashedPassword,
                first_name: firstName,
                last_name: lastName,
                role,
                phone,
                school_id: 'school-1',
                metadata: {
                    child_id: role === 'parent' ? childId : undefined,
                    id_proof_url: role === 'teacher' ? idProofUrl : undefined,
                    registration_verified: role === 'parent' ? false : true // Parents might need manual verification or OTP
                },
            },
        ])
            .select()
            .single();
        if (insertError) {
            console.error('Insert user error:', insertError);
            res.status(500).json({ success: false, message: 'Registration failed', error: insertError.message });
            return;
        }
        // Map the parent to the student if childId is provided
        if (role === 'parent' && childId) {
            const { error: studentUpdateError } = await client
                .from('students')
                .update({ parent_user_id: newUser.id })
                .eq('id', childId);
            if (studentUpdateError) {
                console.error('Failed to link parent to student:', studentUpdateError);
            }
            // Also add to parent_student_guardians join table if it exists
            const { error: guardianError } = await client
                .from('parent_student_guardians')
                .insert({
                parent_user_id: newUser.id,
                student_id: childId,
                relationship_type: 'parent',
                is_primary: true
            });
            if (guardianError) {
                // Log but don't fail registration as the main user record is created
                console.error('Guardian link error:', guardianError);
            }
        }
        // Return user (without password hash)
        const safeUser = sanitizeUserRow(newUser);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: safeUser,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        next(error);
    }
};
exports.registerUser = registerUser;
/**
 * Authenticate a user by email and password
 * POST /api/users/login
 */
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' });
            return;
        }
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            const normalizedEmail = String(email).trim().toLowerCase();
            const inferredRole = normalizedEmail.includes('admin')
                ? 'admin'
                : normalizedEmail.includes('principal')
                    ? 'principal'
                    : normalizedEmail.includes('head-teacher') || normalizedEmail.includes('head teacher')
                        ? 'head-teacher'
                        : normalizedEmail.includes('teacher')
                            ? 'teacher'
                            : normalizedEmail.includes('staff')
                                ? 'staff'
                                : normalizedEmail.includes('parent')
                                    ? 'parent'
                                    : null;
            if (!inferredRole) {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
                return;
            }
            const mockUser = fallbackUser(email, inferredRole);
            res.status(200).json({
                success: true,
                message: 'Login successful (fallback mode)',
                user: mockUser,
                token: 'mock-token',
            });
            return;
        }
        const { data: user, error } = await client
            .from('users')
            .select('id, email, role, first_name, last_name, school_id, created_at, updated_at, password_hash')
            .eq('email', email)
            .single();
        if (error || !user) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        if (!isAllowedRole(user.role)) {
            res.status(500).json({ success: false, message: 'User role is invalid in the database' });
            return;
        }
        const passwordMatches = await bcrypt_1.default.compare(password, user.password_hash ?? '');
        if (!passwordMatches) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const safeUser = sanitizeUserRow(user);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: safeUser,
            token: 'auth-token',
        });
    }
    catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};
exports.loginUser = loginUser;
/**
 * Authenticate admin tools access via admin_auth table
 * POST /api/users/admin-auth
 */
const authenticateAdminTools = async (req, res, next) => {
    try {
        const { email, secret } = req.body;
        if (!email || !secret) {
            res.status(400).json({ success: false, message: 'Email and admin secret are required' });
            return;
        }
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            const normalizedEmail = String(email).trim().toLowerCase();
            // Ensure specific admin email and secret are checked during fallback
            if (normalizedEmail !== 'admin@beattheheat.local' || secret !== 'AdminAuth#2026') {
                res.status(401).json({ success: false, message: 'Invalid admin authentication' });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Admin tools authenticated (fallback mode)',
            });
            return;
        }
        const { data: adminUser, error: adminUserError } = await client
            .from('users')
            .select('id, email, role')
            .eq('email', email)
            .eq('role', 'admin')
            .single();
        if (adminUserError || !adminUser) {
            res.status(401).json({ success: false, message: 'Invalid admin authentication' });
            return;
        }
        const { data: authRecord, error: authError } = await client
            .from('admin_auth')
            .select('id, secret_hash, is_active')
            .eq('admin_user_id', adminUser.id)
            .eq('auth_label', 'primary')
            .single();
        if (authError || !authRecord || !authRecord.is_active) {
            res.status(401).json({ success: false, message: 'Invalid admin authentication' });
            return;
        }
        const matches = await bcrypt_1.default.compare(secret, authRecord.secret_hash ?? '');
        if (!matches) {
            res.status(401).json({ success: false, message: 'Invalid admin authentication' });
            return;
        }
        await client
            .from('admin_auth')
            .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', authRecord.id);
        res.status(200).json({
            success: true,
            message: 'Admin tools authenticated',
        });
    }
    catch (error) {
        console.error('Admin tools auth error:', error);
        next(error);
    }
};
exports.authenticateAdminTools = authenticateAdminTools;
/**
 * List users, optionally filtered by role
 * GET /api/users?role=parent
 */
const listUsers = async (req, res, next) => {
    try {
        const role = typeof req.query.role === 'string' ? req.query.role : undefined;
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            const users = role ? fallbackUsers.filter((user) => user.role === role) : fallbackUsers;
            res.status(200).json({
                success: true,
                message: 'Users (fallback mode)',
                users,
            });
            return;
        }
        let query = client
            .from('users')
            .select('id, email, role, first_name, last_name, phone, school_id, created_at, updated_at')
            .order('created_at', { ascending: false });
        if (role) {
            query = query.eq('role', role);
        }
        const { data, error } = await query;
        if (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Users',
            users: (data ?? []).map(mapUserRow),
        });
    }
    catch (error) {
        console.error('List users error:', error);
        next(error);
    }
};
exports.listUsers = listUsers;
/**
 * Get user profile by ID
 * GET /api/users/:id
 */
const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            res.status(200).json({
                success: true,
                message: 'User profile (fallback)',
                user: fallbackUser('user@demo.com', 'teacher'),
            });
            return;
        }
        const { data: user, error } = await client
            .from('users')
            .select('id, email, role, first_name, last_name, school_id, created_at, updated_at')
            .eq('id', id)
            .single();
        if (error) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const safeUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            schoolId: user.school_id,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        };
        res.status(200).json({ success: true, user: safeUser });
    }
    catch (error) {
        console.error('Get user error:', error);
        next(error);
    }
};
exports.getUserProfile = getUserProfile;
/**
 * Send OTP to email
 * POST /api/users/send-otp
 */
const sendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }
        // Generate OTP
        const { code, expiresIn } = (0, otp_service_1.createOTP)(email);
        // Send OTP email
        const emailSent = await (0, email_service_1.sendOTPEmail)(email, code, expiresIn);
        if (!emailSent) {
            res.status(500).json({ success: false, message: 'Failed to send OTP email' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            expiresIn, // seconds
        });
    }
    catch (error) {
        console.error('Send OTP error:', error);
        next(error);
    }
};
exports.sendOTP = sendOTP;
/**
 * Verify OTP code
 * POST /api/users/verify-otp
 */
const verifyOTPCode = async (req, res, next) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            res.status(400).json({ success: false, message: 'Email and code are required' });
            return;
        }
        // Verify OTP
        const result = (0, otp_service_1.verifyOTP)(email, code);
        if (!result.valid) {
            res.status(401).json({ success: false, message: result.message });
            return;
        }
        res.status(200).json({
            success: true,
            message: result.message,
            verified: true,
        });
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        next(error);
    }
};
exports.verifyOTPCode = verifyOTPCode;
/**
 * Check OTP verification status
 * GET /api/users/otp-status/:email
 */
const getOTPStatus = async (req, res, next) => {
    try {
        const { email } = req.params;
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }
        const verified = (0, otp_service_1.isOTPVerified)(email);
        const expiryTime = (0, otp_service_1.getOTPExpiryTime)(email);
        res.status(200).json({
            success: true,
            verified,
            expiryTime, // seconds remaining
        });
    }
    catch (error) {
        console.error('Get OTP status error:', error);
        next(error);
    }
};
exports.getOTPStatus = getOTPStatus;
/**
 * Delete a user by ID
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            res.status(200).json({
                success: true,
                message: 'User deleted (fallback mode)',
            });
            return;
        }
        const { error } = await client
            .from('users')
            .delete()
            .eq('id', id);
        if (error) {
            res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        next(error);
    }
};
exports.deleteUser = deleteUser;
/**
 * Update user profile
 * PUT /api/users/:id
 */
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, newEmail, preferences } = req.body;
        if (!id) {
            res.status(400).json({ success: false, message: 'User ID is required' });
            return;
        }
        const client = (0, supabase_1.getSupabaseAdminClient)();
        if (!client) {
            // Fallback: pretend update succeeded
            res.status(200).json({ success: true, message: 'Profile updated (fallback mode)', user: { id, firstName, lastName, phone, email: newEmail || null, preferences } });
            return;
        }
        const updatePayload = {};
        if (typeof firstName === 'string')
            updatePayload.first_name = firstName;
        if (typeof lastName === 'string')
            updatePayload.last_name = lastName;
        if (typeof phone === 'string')
            updatePayload.phone = phone;
        // If changing email, require OTP verification for the new email
        if (typeof newEmail === 'string' && newEmail.trim().length > 0) {
            const verified = (0, otp_service_1.isOTPVerified)(newEmail);
            if (!verified) {
                res.status(400).json({ success: false, message: 'New email not verified via OTP' });
                return;
            }
            updatePayload.email = newEmail.trim();
        }
        if (preferences && typeof preferences === 'object') {
            updatePayload.metadata = preferences;
        }
        const { data, error } = await client
            .from('users')
            .update(updatePayload)
            .eq('id', id)
            .select('id, email, role, first_name, last_name, phone, school_id, created_at, updated_at')
            .single();
        if (error) {
            res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
            return;
        }
        const safeUser = {
            id: data.id,
            email: data.email,
            role: data.role,
            firstName: data.first_name,
            lastName: data.last_name,
            phone: data.phone,
            schoolId: data.school_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
        res.status(200).json({ success: true, message: 'User updated', user: safeUser });
    }
    catch (error) {
        console.error('Update user error:', error);
        next(error);
    }
};
exports.updateUser = updateUser;
//# sourceMappingURL=userController.js.map