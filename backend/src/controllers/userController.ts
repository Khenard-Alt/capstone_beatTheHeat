import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createOTP, verifyOTP, isOTPVerified, clearOTP as _clearOTP, getOTPExpiryTime } from '../services/otp.service';
import { sendOTPEmail, sendWelcomeEmail as _sendWelcomeEmail } from '../services/email.service'; // eslint-disable-line @typescript-eslint/no-unused-vars

const allowedRoles = ['admin', 'principal', 'head-teacher', 'teacher', 'staff', 'parent'] as const;

type AllowedRole = (typeof allowedRoles)[number];

const isAllowedRole = (role: unknown): role is AllowedRole =>
  typeof role === 'string' && allowedRoles.includes(role as AllowedRole);

const fallbackUser = (email: string, role: string) => ({
  id: crypto.randomUUID(),
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

const inferFallbackRole = (email: string): AllowedRole | null => {
  const normalizedEmail = String(email).trim().toLowerCase();

  if (normalizedEmail.includes('admin')) {
    return 'admin';
  }

  if (normalizedEmail.includes('principal')) {
    return 'principal';
  }

  if (normalizedEmail.includes('head-teacher') || normalizedEmail.includes('head teacher')) {
    return 'head-teacher';
  }

  if (normalizedEmail.includes('teacher')) {
    return 'teacher';
  }

  if (normalizedEmail.includes('staff')) {
    return 'staff';
  }

  if (normalizedEmail.includes('parent')) {
    return 'parent';
  }

  return null;
};

const sanitizeUserRow = (user: {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.first_name,
  lastName: user.last_name,
  schoolId: user.school_id,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const mapUserRow = (user: {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  school_id: string;
  created_at: string;
  updated_at: string;
}) => ({
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

const raceWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

/**
 * Register a new user (parent or teacher)
 * POST /api/users/register
 */
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const client = getSupabaseAdminClient();

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
    const hashedPassword = await bcrypt.hash(password, 10);

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
  } catch (error) {
    console.error('Register error:', error);
    next(error);
  }
};

/**
 * Authenticate a user by email and password
 * POST /api/users/login
 */
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      const inferredRole = inferFallbackRole(email);

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

    const loginTimeoutMs = Number(process.env.SUPABASE_LOGIN_TIMEOUT_MS ?? 5000);

    let user: any;
    let error: any;

    try {
      const result = await raceWithTimeout(
        // Supabase PostgrestBuilder isn't typed as a Promise; cast to Promise to satisfy raceWithTimeout
        (client
          .from('users')
          .select('id, email, role, first_name, last_name, school_id, created_at, updated_at, password_hash')
          .eq('email', email)
          .single()) as unknown as Promise<{ data?: any; error?: any }>,
        loginTimeoutMs
      );

      user = (result as any)?.data;
      error = (result as any)?.error;
    } catch (queryError) {
      if (process.env.NODE_ENV !== 'production') {
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

      throw queryError;
    }

    if (error || !user) {
      if (process.env.NODE_ENV !== 'production') {
        const inferredRole = inferFallbackRole(email);
        if (inferredRole) {
          const mockUser = fallbackUser(email, inferredRole);
          res.status(200).json({
            success: true,
            message: 'Login successful (fallback mode)',
            user: mockUser,
            token: 'mock-token',
          });
          return;
        }
      }

      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!isAllowedRole(user.role)) {
      res.status(500).json({ success: false, message: 'User role is invalid in the database' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash ?? '');

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
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Authenticate admin tools access via admin_auth table
 * POST /api/users/admin-auth
 */
export const authenticateAdminTools = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, secret } = req.body;

    if (!email || !secret) {
      res.status(400).json({ success: false, message: 'Email and admin secret are required' });
      return;
    }

    const client = getSupabaseAdminClient();

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

    const matches = await bcrypt.compare(secret, authRecord.secret_hash ?? '');

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
  } catch (error) {
    console.error('Admin tools auth error:', error);
    next(error);
  }
};

/**
 * List users, optionally filtered by role
 * GET /api/users?role=parent
 */
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const client = getSupabaseAdminClient();

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
  } catch (error) {
    console.error('List users error:', error);
    next(error);
  }
};

/**
 * Get user profile by ID
 * GET /api/users/:id
 */
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const client = getSupabaseAdminClient();
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
  } catch (error) {
    console.error('Get user error:', error);
    next(error);
  }
};

/**
 * Send OTP to email
 * POST /api/users/send-otp
 */
export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    // Generate OTP
    const { code, expiresIn } = createOTP(email);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, code, expiresIn);

    if (!emailSent) {
      res.status(500).json({ success: false, message: 'Failed to send OTP email' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn, // seconds
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    next(error);
  }
};

/**
 * Verify OTP code
 * POST /api/users/verify-otp
 */
export const verifyOTPCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ success: false, message: 'Email and code are required' });
      return;
    }

    // Verify OTP
    const result = verifyOTP(email, code);

    if (!result.valid) {
      res.status(401).json({ success: false, message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      verified: true,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    next(error);
  }
};

/**
 * Check OTP verification status
 * GET /api/users/otp-status/:email
 */
export const getOTPStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const verified = isOTPVerified(email);
    const expiryTime = getOTPExpiryTime(email);

    res.status(200).json({
      success: true,
      verified,
      expiryTime, // seconds remaining
    });
  } catch (error) {
    console.error('Get OTP status error:', error);
    next(error);
  }
};

/**
 * Delete a user by ID
 * DELETE /api/users/:id
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const client = getSupabaseAdminClient();

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
  } catch (error) {
    console.error('Delete user error:', error);
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/users/:id
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, newEmail, preferences } = req.body;

    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      // Fallback: pretend update succeeded
      res.status(200).json({ success: true, message: 'Profile updated (fallback mode)', user: { id, firstName, lastName, phone, email: newEmail || null, preferences } });
      return;
    }

    const updatePayload: any = {};
    if (typeof firstName === 'string') updatePayload.first_name = firstName;
    if (typeof lastName === 'string') updatePayload.last_name = lastName;
    if (typeof phone === 'string') updatePayload.phone = phone;

    // If changing email, require OTP verification for the new email
    if (typeof newEmail === 'string' && newEmail.trim().length > 0) {
      const verified = isOTPVerified(newEmail);
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
  } catch (error) {
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * Get children/students linked to a parent user
 * GET /api/users/:id/children
 */
export const getUserChildren = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      // No DB client — return empty list in fallback mode
      res.status(200).json({ success: true, message: 'Children (fallback)', children: [] });
      return;
    }

    const { data, error } = await client
      .from('students')
      .select('id, first_name, last_name, grade_level, section, school_id')
      .eq('parent_user_id', id)
      .eq('status', 'active')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Get user children error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch children', error: error.message });
      return;
    }

    const mapped = (data ?? []).map((student: any) => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      grade: student.grade_level ?? undefined,
      section: student.section ?? undefined,
      schoolId: student.school_id,
    }));

    res.status(200).json({ success: true, message: 'Children', children: mapped });
  } catch (error) {
    console.error('Get user children exception:', error);
    next(error);
  }
};
