/* Seed demo incidents for student s1 and s2 */
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
    const rows = [
      {
        school_id: 'school-1',
        reporter_id: null,
        student_id: 's1',
        type: 'heat_exhaustion',
        description: 'Student felt dizzy during PE; given water and rest. (demo)',
        action_taken: 'Rested and hydrated',
        heat_index_at_time: 37.5,
      },
      {
        school_id: 'school-1',
        reporter_id: null,
        student_id: 's2',
        type: 'heat_cramp',
        description: 'Student reported muscle cramps after prolonged play. (demo)',
        action_taken: 'Provided electrolytes and rest',
        heat_index_at_time: 36.2,
      },
    ];

    console.log('Inserting demo incidents...');
    const { error } = await supabase.from('incidents').insert(rows);
    if (error) {
      console.error('Failed to insert demo incidents:', error.message || error);
      process.exit(1);
    }

    console.log('Demo incidents inserted.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();