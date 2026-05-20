/*
  Seed daily advisory notifications for today and tomorrow at configured times.
  Usage: node backend/scripts/seed-daily-notifs.js [schoolId]
*/
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const times = (process.env.DAILY_NOTIFICATION_TIMES ?? '09:00,14:00,18:00')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const schoolId = process.argv[2] || process.env.DEFAULT_SCHOOL_ID || 'school-1';

function buildDateForTime(baseDate, hhmm) {
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  const d = new Date(baseDate);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

(async () => {
  try {
    console.log(`Seeding notifications for school ${schoolId} at times: ${times.join(', ')}`);

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)
      .in('role', ['parent', 'principal', 'teacher']);

    if (usersError) {
      console.error('Failed to fetch users:', usersError.message || usersError);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('No users found for school', schoolId);
      process.exit(0);
    }

    const userIds = users.map((u) => u.id);

    const rows = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    [today, tomorrow].forEach((day) => {
      times.forEach((t) => {
        const sentAt = buildDateForTime(day, t);
        const title = `Scheduled Advisory - ${t}`;
        const message = `This is the scheduled advisory for ${t}. Please review school guidance.`;
        const createdAt = new Date().toISOString();

        userIds.forEach((uid) => {
          rows.push({
            user_id: uid,
            type: 'advisory',
            title,
            message,
            status: 'unread',
            priority: 'medium',
            sent_at: sentAt,
            created_at: createdAt,
          });
        });
      });
    });

    console.log(`Inserting ${rows.length} notification rows...`);
    const { error: insertError } = await supabase.from('notifications').insert(rows);
    if (insertError) {
      console.error('Failed to insert notifications:', insertError.message || insertError);
      process.exit(1);
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
