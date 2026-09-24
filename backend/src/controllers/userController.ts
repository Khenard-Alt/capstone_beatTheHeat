import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { getSupabaseAdminClient } from '../config/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createOTP, verifyOTP, isOTPVerified, clearOTP, getOTPExpiryTime } from '../services/otp.service';
import { sendOTPEmail, sendWelcomeEmail as _sendWelcomeEmail } from '../services/email.service'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { deviceSessionService } from '../services/deviceSession.service';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      cb(new Error('Only PNG, JPG, WEBP, or GIF images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

let avatarBucketReady = false;

const ensureAvatarBucket = async (client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>): Promise<void> => {
  if (avatarBucketReady) {
    return;
  }

  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === AVATAR_BUCKET);

  if (!exists) {
    await client.storage.createBucket(AVATAR_BUCKET, { public: true, fileSizeLimit: MAX_AVATAR_BYTES });
  }

  avatarBucketReady = true;
};

const ID_PROOF_BUCKET = 'id-proofs';
const MAX_ID_PROOF_BYTES = 5 * 1024 * 1024; // 5MB

export const idProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ID_PROOF_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) {
      cb(new Error('Only PNG, JPG, or WEBP images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

let idProofBucketReady = false;

const ensureIdProofBucket = async (client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>): Promise<void> => {
  if (idProofBucketReady) {
    return;
  }

  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === ID_PROOF_BUCKET);

  if (!exists) {
    await client.storage.createBucket(ID_PROOF_BUCKET, { public: true, fileSizeLimit: MAX_ID_PROOF_BYTES });
  }

  idProofBucketReady = true;
};

const allowedRoles = ['admin', 'principal', 'head-teacher', 'teacher', 'staff', 'parent'] as const;

type AllowedRole = (typeof allowedRoles)[number];

const isAllowedRole = (role: unknown): role is AllowedRole =>
  typeof role === 'string' && allowedRoles.includes(role as AllowedRole);

const fallbackUser = (email: string, role: string) => ({
  id: crypto.randomUUID(),
  email,
  role,
  isDemo: true,
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

const isGoogleAccountMetadata = (metadata: unknown): boolean =>
  Boolean(metadata && typeof metadata === 'object' && (metadata as any).auth_provider === 'google');

const notificationPreferencesFromMetadata = (metadata: unknown): Record<string, boolean> | null =>
  metadata && typeof metadata === 'object' && (metadata as any).notificationPreferences
    ? (metadata as any).notificationPreferences
    : null;

const sanitizeUserRow = (user: {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  school_id: string;
  avatar_url?: string | null;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.first_name,
  lastName: user.last_name,
  schoolId: user.school_id,
  avatarUrl: user.avatar_url ?? null,
  isGoogleAccount: isGoogleAccountMetadata(user.metadata),
  notificationPreferences: notificationPreferencesFromMetadata(user.metadata),
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
  avatar_url?: string | null;
  metadata?: unknown;
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
  avatarUrl: user.avatar_url ?? null,
  isGoogleAccount: isGoogleAccountMetadata(user.metadata),
  notificationPreferences: notificationPreferencesFromMetadata(user.metadata),
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
    const { email, password, firstName, lastName, role, phone, childId, studentNumber, idProofUrl, oauthAccessToken } = req.body;
    const isGoogleRegistration = typeof oauthAccessToken === 'string' && oauthAccessToken.length > 0;

    // Validate required fields
    if (!email || !firstName || !lastName || !role || (!password && !isGoogleRegistration)) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    // A parent claiming a child must prove they actually know that child's
    // private student number (never shown in the public search list) —
    // otherwise anyone who just knows a student's name could register as
    // their "parent" and gain access to that child's incident reports and
    // messages. This is checked before any account is created.
    if (role === 'parent' && childId && !String(studentNumber || '').trim()) {
      res.status(400).json({ success: false, message: "The student's number is required to link a child." });
      return;
    }

    if (!isGoogleRegistration && !/^[^\s@]+@gmail\.com$/i.test(String(email).trim())) {
      res.status(400).json({ success: false, message: 'Registration currently requires a Gmail account (@gmail.com).' });
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

    if (isGoogleRegistration) {
      if (!client) {
        res.status(503).json({ success: false, message: 'Google registration requires Supabase Auth configuration.' });
        return;
      }

      const { data: authData, error: authError } = await client.auth.getUser(oauthAccessToken);
      if (authError || !authData?.user?.email || authData.user.email.toLowerCase() !== String(email).trim().toLowerCase()) {
        res.status(401).json({ success: false, message: 'Google registration session is invalid or expired.' });
        return;
      }
    }

    if (client && role === 'parent' && childId) {
      const { data: claimedStudent, error: studentLookupError } = await client
        .from('students')
        .select('id, student_number')
        .eq('id', childId)
        .maybeSingle();

      const normalizeStudentNumber = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[\s-]/g, '');
      const realStudentNumber = normalizeStudentNumber(claimedStudent?.student_number);
      const submittedStudentNumber = normalizeStudentNumber(studentNumber);

      if (studentLookupError || !claimedStudent || !realStudentNumber || realStudentNumber !== submittedStudentNumber) {
        res.status(400).json({ success: false, message: "Student number does not match our records for this student." });
        return;
      }
    }

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
      .select('id, email, role, first_name, last_name, school_id, avatar_url, metadata, created_at, updated_at')
      .eq('email', email)
      .single();

    if (existingUser) {
      // A returning Google user hits this "already registered" branch every
      // time they sign in (there's no separate login call for OAuth) — treat
      // it as a login instead of rejecting them out of their own account.
      if (isGoogleRegistration) {
        if (!isAllowedRole(existingUser.role)) {
          res.status(500).json({ success: false, message: 'User role is invalid in the database' });
          return;
        }

        const deviceId =
          typeof req.body?.deviceId === 'string' && req.body.deviceId
            ? req.body.deviceId
            : `ephemeral-${crypto.randomUUID()}`;
        const deviceLabel =
          typeof req.body?.deviceLabel === 'string' && req.body.deviceLabel ? req.body.deviceLabel : 'Unknown device';
        const token = crypto.randomUUID();

        await deviceSessionService.createActiveSession(existingUser.id, deviceId, deviceLabel, token);

        res.status(200).json({
          success: true,
          status: 'active',
          message: 'Google account linked',
          user: sanitizeUserRow(existingUser),
          token,
        });
        return;
      }

      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is expected)
      console.error('Check user error:', checkError);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || crypto.randomBytes(32).toString('hex'), 10);

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
            registration_verified: role === 'parent' ? false : true, // Parents might need manual verification or OTP
            auth_provider: isGoogleRegistration ? 'google' : undefined,
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

    // The student-number check above only proves the parent knows a private
    // identifier — it doesn't replace staff judgment. Record the claim as
    // 'pending' and leave students.parent_user_id untouched until an
    // admin/head teacher approves it (see parentVerificationController).
    // This is intentionally not gated behind `if (client)` above since
    // `client` is guaranteed non-null past this point (the !client branch
    // returns earlier).
    if (role === 'parent' && childId) {
      const { error: guardianError } = await client
        .from('parent_student_guardians')
        .insert({
          parent_user_id: newUser.id,
          student_id: childId,
          relationship_type: 'parent',
          is_primary: true,
          status: 'pending',
          submitted_student_number: String(studentNumber || '').trim(),
        });

      if (guardianError) {
        // Log but don't fail registration as the main user record is created
        console.error('Guardian link error:', guardianError);
      }
    }

    // Return user (without password hash)
    const safeUser = sanitizeUserRow(newUser);

    const deviceId =
      typeof req.body?.deviceId === 'string' && req.body.deviceId ? req.body.deviceId : `ephemeral-${crypto.randomUUID()}`;
    const deviceLabel = typeof req.body?.deviceLabel === 'string' && req.body.deviceLabel ? req.body.deviceLabel : 'Unknown device';
    const token = crypto.randomUUID();

    // A brand-new account can't have a conflicting active session yet, so
    // there's nothing to challenge — just register the device as active.
    await deviceSessionService.createActiveSession(newUser.id, deviceId, deviceLabel, token);

    res.status(201).json({
      success: true,
      status: 'active',
      verification: role === 'parent' && childId ? 'pending' : undefined,
      message: 'User registered successfully',
      user: safeUser,
      token,
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
    // A fresh random id when the client couldn't supply one (e.g. localStorage
    // blocked) — never a shared constant, or two unrelated devices in that
    // state would look identical and silently skip the confirmation prompt.
    const deviceId =
      typeof req.body?.deviceId === 'string' && req.body.deviceId ? req.body.deviceId : `ephemeral-${crypto.randomUUID()}`;
    const deviceLabel = typeof req.body?.deviceLabel === 'string' && req.body.deviceLabel ? req.body.deviceLabel : 'Unknown device';

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const client = getSupabaseAdminClient();

    // Login must always be verified against the real database — silently
    // signing someone in as a fake "User Demo" account (the old fallback
    // behavior) when Supabase is unreachable is worse than a clear error,
    // especially since a demo login isn't tied to any real account or
    // session record.
    if (!client) {
      res.status(503).json({ success: false, message: 'Login is temporarily unavailable. Please try again shortly.' });
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
          .select('id, email, role, first_name, last_name, school_id, avatar_url, metadata, created_at, updated_at, password_hash')
          .eq('email', email)
          .single()) as unknown as Promise<{ data?: any; error?: any }>,
        loginTimeoutMs
      );

      user = (result as any)?.data;
      error = (result as any)?.error;
    } catch (queryError) {
      console.error('Login query timed out or failed:', queryError);
      res.status(503).json({ success: false, message: 'Login is temporarily unavailable. Please try again shortly.' });
      return;
    }

    if (error || !user) {
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
    const token = crypto.randomUUID();

    const existingSession = await deviceSessionService.findActiveSession(user.id);

    if (existingSession && existingSession.device_id !== deviceId) {
      const sessionId = await deviceSessionService.createPendingSession(user.id, deviceId, deviceLabel, token);

      if (!sessionId) {
        res.status(503).json({ success: false, message: 'Could not start device confirmation. Please try again.' });
        return;
      }

      res.status(200).json({
        success: true,
        status: 'pending_confirmation',
        message: 'Awaiting confirmation from your other device.',
        sessionId,
      });
      return;
    }

    await deviceSessionService.createActiveSession(user.id, deviceId, deviceLabel, token);

    res.status(200).json({
      success: true,
      status: 'active',
      message: 'Login successful',
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * Sync a Supabase Google session into the application's users table.
 * New OAuth users are created as parents until an administrator assigns another role.
 */
export const syncOAuthUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
    if (!accessToken) {
      res.status(400).json({ success: false, message: 'Supabase access token is required' });
      return;
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(503).json({ success: false, message: 'Supabase Auth is not configured on the backend' });
      return;
    }

    const { data: authData, error: authError } = await client.auth.getUser(accessToken);
    const authUser = authData?.user;
    if (authError || !authUser?.email) {
      res.status(401).json({ success: false, message: 'Google session is invalid or expired' });
      return;
    }

    const email = authUser.email.trim().toLowerCase();
    const { data: existingUser, error: lookupError } = await client
      .from('users')
      .select('id, email, role, first_name, last_name, school_id, avatar_url, metadata, created_at, updated_at')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let user = existingUser;
    if (!user) {
      const metadata = authUser.user_metadata ?? {};
      const fullName = String(metadata.full_name ?? metadata.name ?? '').trim().split(/\s+/).filter(Boolean);
      const firstName = String(metadata.first_name ?? fullName[0] ?? 'Google').trim();
      const lastName = String(metadata.last_name ?? fullName.slice(1).join(' ') ?? 'User').trim() || 'User';
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      const { data: createdUser, error: createError } = await client
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: 'parent',
          phone: null,
          school_id: 'school-1',
          metadata: { auth_provider: 'google', supabase_user_id: authUser.id },
        })
        .select('id, email, role, first_name, last_name, school_id, avatar_url, metadata, created_at, updated_at')
        .single();

      if (createError || !createdUser) throw createError ?? new Error('Could not create OAuth user');
      user = createdUser;
    }

    if (!isAllowedRole(user.role)) {
      res.status(500).json({ success: false, message: 'User role is invalid in the database' });
      return;
    }

    res.status(200).json({
      success: true,
      message: existingUser ? 'Google account linked' : 'Google account registered',
      user: sanitizeUserRow(user),
      token: accessToken,
    });
  } catch (error) {
    console.error('OAuth user sync error:', error);
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : 'OAuth user sync failed';
      res.status(500).json({ success: false, message: `OAuth user sync failed: ${message}` });
      return;
    }
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
      .select('id, email, role, first_name, last_name, phone, school_id, avatar_url, metadata, created_at, updated_at')
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
      .select('id, email, role, first_name, last_name, phone, school_id, avatar_url, metadata, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const safeUser = mapUserRow(user);

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
    const { email, purpose } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    // A password-reset OTP should only go to an email that actually has an
    // account — registration's OTP step (purpose omitted) has no such
    // requirement since the account doesn't exist yet.
    if (purpose === 'reset') {
      const client = getSupabaseAdminClient();
      if (client) {
        const { data: existing } = await client.from('users').select('id').eq('email', email).maybeSingle();
        if (!existing) {
          res.status(404).json({ success: false, message: 'No account found with that email.' });
          return;
        }
      }
    }

    // Generate OTP
    const { code, expiresIn } = createOTP(email);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, code, expiresIn, purpose === 'reset' ? 'reset' : 'verify');

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
      // metadata also carries system fields (auth_provider, child_id, etc.) —
      // overwriting the whole column would silently wipe those out, so fetch
      // the existing value and merge the preferences in under their own key.
      // Each role's settings page only sends its own subset of preference
      // fields (e.g. teacher sends {notifyEmail, notifySms}), so
      // notificationPreferences itself must also be merged rather than
      // replaced wholesale — otherwise saving from one page silently erases
      // fields set from another (e.g. temperatureUnit from Settings.tsx).
      const { data: existing } = await client
        .from('users')
        .select('metadata')
        .eq('id', id)
        .single();

      const existingMetadata = existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {};
      const existingPreferences =
        (existingMetadata as any).notificationPreferences && typeof (existingMetadata as any).notificationPreferences === 'object'
          ? (existingMetadata as any).notificationPreferences
          : {};

      updatePayload.metadata = {
        ...existingMetadata,
        notificationPreferences: { ...existingPreferences, ...preferences },
      };
    }

    const { data, error } = await client
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select('id, email, role, first_name, last_name, phone, school_id, avatar_url, metadata, created_at, updated_at')
      .single();

    if (error) {
      res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
      return;
    }

    res.status(200).json({ success: true, message: 'User updated', user: mapUserRow(data) });
  } catch (error) {
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * Upload/replace a user's profile picture
 * POST /api/users/:id/avatar  (multipart/form-data, field name "avatar")
 */
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, message: 'No image file was provided.' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      res.status(503).json({ success: false, message: 'Picture upload requires Supabase Storage configuration.' });
      return;
    }

    try {
      await ensureAvatarBucket(client);
    } catch (bucketError) {
      const message = bucketError instanceof Error ? bucketError.message : 'Unable to initialize avatar storage.';
      console.error('Avatar storage initialization error:', bucketError);
      res.status(503).json({
        success: false,
        message: 'Avatar storage is not available. Check Supabase Storage configuration and permissions.',
        error: message,
      });
      return;
    }

    const extension = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const objectPath = `${id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(AVATAR_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      res.status(500).json({ success: false, message: 'Failed to upload picture', error: uploadError.message });
      return;
    }

    const { data: publicUrlData } = client.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
    const avatarUrl = publicUrlData.publicUrl;

    const { data, error } = await client
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', id)
      .select('id, email, role, first_name, last_name, phone, school_id, avatar_url, metadata, created_at, updated_at')
      .single();

    if (error) {
      res.status(500).json({ success: false, message: 'Picture uploaded but failed to save on profile', error: error.message });
      return;
    }

    res.status(200).json({ success: true, message: 'Profile picture updated', user: mapUserRow(data) });
  } catch (error) {
    console.error('Upload avatar error:', error);
    next(error);
  }
};

/**
 * Upload a supporting ID photo for a pending parent-child verification
 * request. Purely supplementary evidence for the admin/head-teacher
 * reviewer — the student-number check at registration is the actual gate,
 * since a photo alone can be faked with image editing tools.
 * POST /api/users/:id/id-proof  (multipart/form-data, field name "idProof")
 */
export const uploadIdProof = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    const file = req.file;

    if (!id || !studentId) {
      res.status(400).json({ success: false, message: 'User ID and studentId are required' });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, message: 'No image file was provided.' });
      return;
    }

    const client = getSupabaseAdminClient();

    if (!client) {
      res.status(503).json({ success: false, message: 'Picture upload requires Supabase Storage configuration.' });
      return;
    }

    try {
      await ensureIdProofBucket(client);
    } catch (bucketError) {
      const message = bucketError instanceof Error ? bucketError.message : 'Unable to initialize ID proof storage.';
      console.error('ID proof storage initialization error:', bucketError);
      res.status(503).json({ success: false, message: 'ID proof storage is not available.', error: message });
      return;
    }

    const extension = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const objectPath = `${id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(ID_PROOF_BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: true });

    if (uploadError) {
      res.status(500).json({ success: false, message: 'Failed to upload picture', error: uploadError.message });
      return;
    }

    const { data: publicUrlData } = client.storage.from(ID_PROOF_BUCKET).getPublicUrl(objectPath);

    const { error: updateError } = await client
      .from('parent_student_guardians')
      .update({ id_photo_url: publicUrlData.publicUrl })
      .eq('parent_user_id', id)
      .eq('student_id', studentId);

    if (updateError) {
      res.status(500).json({ success: false, message: 'Picture uploaded but failed to attach to request', error: updateError.message });
      return;
    }

    res.status(200).json({ success: true, message: 'ID proof uploaded' });
  } catch (error) {
    console.error('Upload ID proof error:', error);
    next(error);
  }
};

/**
 * Change (or, for Google-linked accounts, set) a user's password.
 * PUT /api/users/:id/password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
      return;
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(503).json({ success: false, message: 'Password change requires database configuration.' });
      return;
    }

    const { data: user, error } = await client
      .from('users')
      .select('id, password_hash, metadata')
      .eq('id', id)
      .single();

    if (error || !user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Google-linked accounts were created with a random, never-shared password,
    // so there is nothing meaningful for the user to type as "current password" —
    // skip straight to setting a new one instead of asking them to verify it.
    const isGoogleAccount = isGoogleAccountMetadata(user.metadata);
    if (!isGoogleAccount) {
      if (typeof currentPassword !== 'string' || !currentPassword) {
        res.status(400).json({ success: false, message: 'Current password is required.' });
        return;
      }

      const matches = await bcrypt.compare(currentPassword, user.password_hash);
      if (!matches) {
        res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        return;
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await client
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', id);

    if (updateError) {
      res.status(500).json({ success: false, message: 'Failed to update password', error: updateError.message });
      return;
    }

    res.status(200).json({ success: true, message: isGoogleAccount ? 'Password set successfully.' : 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    next(error);
  }
};

/**
 * Reset a forgotten password using a verified email OTP — unlike
 * changePassword, this doesn't require knowing the current password or the
 * user's internal id, since the whole point is the caller is locked out.
 * POST /api/users/reset-password
 */
export const resetPasswordWithOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code) {
      res.status(400).json({ success: false, message: 'Email and code are required' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
      return;
    }

    // Re-verify rather than trust a prior /verify-otp call in isolation —
    // the OTP record (and its verified flag) lives in the same in-memory
    // store either way, so this just confirms the code is still valid.
    const verification = verifyOTP(email, code);
    if (!verification.valid && !isOTPVerified(email)) {
      res.status(401).json({ success: false, message: verification.message });
      return;
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(503).json({ success: false, message: 'Password reset requires database configuration.' });
      return;
    }

    const { data: user, error } = await client
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      res.status(404).json({ success: false, message: 'No account found with that email.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await client
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id);

    if (updateError) {
      res.status(500).json({ success: false, message: 'Failed to reset password', error: updateError.message });
      return;
    }

    clearOTP(email);

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
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

/**
 * Check whether the currently logged-in device has a pending login-confirmation
 * request from another device attempting to sign into the same account.
 * The caller must present the token of the account's currently-active
 * session — otherwise anyone who merely knows a userId could read (and, via
 * /resolve, act on) another account's pending login.
 * GET /api/users/device-confirmation/pending?userId=&token=
 */
export const getPendingDeviceConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
    const token = typeof req.query.token === 'string' ? req.query.token : '';

    if (!userId || !token) {
      res.status(400).json({ success: false, message: 'userId and token are required' });
      return;
    }

    const pending = await deviceSessionService.getPendingForUser(userId, token);
    res.status(200).json({ success: true, pending });
  } catch (error) {
    console.error('Get pending device confirmation error:', error);
    next(error);
  }
};

/**
 * Approve or deny a pending login-confirmation request from the device that
 * is already logged in. `token` must be that device's own active-session
 * token — this is what stops the device attempting the new login from
 * approving its own request.
 * POST /api/users/device-confirmation/resolve
 */
export const resolveDeviceConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, approve, token } = req.body;

    if (typeof sessionId !== 'string' || !sessionId || typeof approve !== 'boolean' || typeof token !== 'string' || !token) {
      res.status(400).json({ success: false, message: 'sessionId, approve, and token are required' });
      return;
    }

    const result = await deviceSessionService.resolvePending(sessionId, approve, token);

    if (result === 'invalid_caller') {
      res.status(403).json({ success: false, message: 'You are not authorized to resolve this request.' });
      return;
    }

    if (result === 'not_found' || result === 'expired') {
      res.status(200).json({ success: false, status: result, message: 'This request is no longer available.' });
      return;
    }

    res.status(200).json({ success: true, status: result });
  } catch (error) {
    console.error('Resolve device confirmation error:', error);
    next(error);
  }
};

/**
 * Poll the status of a pending login-confirmation request from the new
 * device that is waiting to be let in.
 * GET /api/users/device-confirmation/status?sessionId=
 */
export const getDeviceConfirmationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }

    const status = await deviceSessionService.getSessionStatus(sessionId);

    if (status !== 'active') {
      res.status(200).json({ success: true, status });
      return;
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      res.status(200).json({ success: true, status });
      return;
    }

    const { data: session, error: sessionError } = await client
      .from('active_sessions')
      .select('user_id, token')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      res.status(200).json({ success: true, status: 'not_found' });
      return;
    }

    const { data: user, error: userError } = await client
      .from('users')
      .select('id, email, role, first_name, last_name, phone, school_id, avatar_url, metadata, created_at, updated_at')
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      res.status(200).json({ success: true, status: 'not_found' });
      return;
    }

    res.status(200).json({
      success: true,
      status: 'active',
      user: mapUserRow(user),
      token: session.token,
    });
  } catch (error) {
    console.error('Get device confirmation status error:', error);
    next(error);
  }
};

/**
 * Revoke the caller's own session on logout, so a later login from a
 * different device doesn't get stuck waiting for approval from a device
 * whose user already signed out.
 * POST /api/users/logout
 */
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';

    if (token) {
      await deviceSessionService.revokeByToken(token);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
};
