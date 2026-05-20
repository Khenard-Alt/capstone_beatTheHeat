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
    const { data: incidents, error: iErr } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50);
    if (iErr) {
      console.error('Error querying incidents:', iErr.message || iErr);
    } else {
      console.log('Incidents rows:', incidents || []);
    }

    const { data: students, error: sErr } = await supabase.from('students').select('*').limit(50);
    if (sErr) {
      console.error('Error querying students:', sErr.message || sErr);
    } else {
      console.log('Students sample:', students || []);
    }

    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();