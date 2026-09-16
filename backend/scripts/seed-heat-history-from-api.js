require('dotenv').config();
const axios = require('axios');

// Unlike seed-heat-history.js (which fabricates weather with a sine-wave
// formula), this hits the backend's own /api/weather/scheduled/backfill
// route, which in turn calls OpenWeather's One Call "timemachine" endpoint
// for real historical readings and persists them the same way the live
// scheduler does. Requires an OpenWeather key with timemachine access.

const baseUrl = process.env.SEED_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const schedulerToken = process.env.WEATHER_SCHEDULER_TOKEN;

// The backend endpoint always backfills the last N days counting from "now"
// (no start-offset param) and hard-caps N at 7 to protect the OpenWeather
// timemachine quota — so this can only ever seed a rolling 7-day window,
// not a full 30-day month. Re-running it later just refreshes the same
// trailing week, which is what lets Weekly (and, once accumulated, Monthly)
// build up real data over time.
const days = Math.min(7, Math.max(1, Number(process.argv[2] || 7)));
const intervalHours = Number(process.argv[3] || 3);

if (!schedulerToken) {
  console.error('Missing WEATHER_SCHEDULER_TOKEN in backend/.env');
  process.exit(1);
}

async function run() {
  console.log(`Backfilling ${days} day(s) of real OpenWeather history (interval: ${intervalHours}h)...`);

  const { data: result } = await axios.post(
    `${baseUrl}/api/weather/scheduled/backfill`,
    { days, intervalHours },
    { headers: { 'x-scheduler-token': schedulerToken } }
  );

  if (!result.success) {
    console.error('Backfill request failed:', result.message);
    process.exit(1);
  }

  const inserted = result.data?.inserted ?? 0;
  console.log(`Inserted ${inserted} real historical weather/heat point(s).`);

  if (Array.isArray(result.data?.failures) && result.data.failures.length > 0) {
    for (const failure of result.data.failures) {
      console.warn(`  Day offset ${failure.dayOffset}: ${failure.reason}`);
    }
  }
}

run().catch((error) => {
  console.error('Seed-from-API script failed:', error?.response?.data || error.message || error);
  process.exit(1);
});
