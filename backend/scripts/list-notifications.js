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

(async () => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('user_id, count:id', { count: 'exact' })
      .limit(100);

    if (error) {
      console.error('Error fetching notifications:', error.message || error);
      process.exit(1);
    }

    // Fetch distinct user ids (top 10 recent)
    const { data: recent, error: rErr } = await supabase
      .from('notifications')
      .select('user_id, id, title, message, sent_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (rErr) {
      console.error('Error fetching recent notifications:', rErr.message || rErr);
      process.exit(1);
    }

    console.log('Recent notifications (sample):');
    console.log(recent || []);

    // distinct user ids
    const users = [...new Set((recent || []).map(r => r.user_id))];
    console.log('\nDistinct user_ids in sample:', users.slice(0, 20));

    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();