/*
  Seed a head-teacher demo account.
  Usage from backend folder: node scripts/seed-head-teacher-account.js
  Or: npm run seed:head-teacher
*/
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const account = {
  email: process.env.HEAD_TEACHER_EMAIL || 'headteacher@beattheheat.local',
  password: process.env.HEAD_TEACHER_PASSWORD || 'Headteacher#2026',
  firstName: process.env.HEAD_TEACHER_FIRST_NAME || 'Head',
  lastName: process.env.HEAD_TEACHER_LAST_NAME || 'Teacher',
  phone: process.env.HEAD_TEACHER_PHONE || '09170000000',
  schoolId: process.env.DEFAULT_SCHOOL_ID || 'school-1',
};

(async () => {
  try {
    const passwordHash = await bcrypt.hash(account.password, 10);

    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', account.email)
      .maybeSingle();

    if (lookupError) {
      console.error('Failed to check existing head-teacher account:', lookupError.message || lookupError);
      process.exit(1);
    }

    const payload = {
      email: account.email,
      password_hash: passwordHash,
      first_name: account.firstName,
      last_name: account.lastName,
      phone: account.phone,
      role: 'head-teacher',
      school_id: account.schoolId,
      metadata: {
        seeded: true,
        source: 'seed-head-teacher-account.js',
      },
    };

    if (existingUser?.id) {
      const { error: updateError } = await supabase
        .from('users')
        .update(payload)
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Failed to update head-teacher account:', updateError.message || updateError);
        process.exit(1);
      }

      console.log(`Updated head-teacher account: ${account.email}`);
      process.exit(0);
    }

    const { error: insertError } = await supabase.from('users').insert([payload]);
    if (insertError) {
      console.error('Failed to insert head-teacher account:', insertError.message || insertError);
      process.exit(1);
    }

    console.log(`Seeded head-teacher account: ${account.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
})();