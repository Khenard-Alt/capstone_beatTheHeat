require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

// OpenWeather's One Call 3.0 "timemachine" endpoint (used by
// seed-heat-history-from-api.js) requires a paid subscription, so it can't
// backfill real historical data on a free key. Open-Meteo's Historical
// Weather API is free, needs no API key, and serves real ERA5-reanalysis
// hourly readings — this script pulls from that instead.

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const schoolId = process.env.SEED_SCHOOL_ID || '00000000-0000-0000-0000-000000000001';
const lat = Number(process.env.SCHOOL_LAT || 14.575);
const lon = Number(process.env.SCHOOL_LON || 121.025);

const days = Math.max(1, Number(process.argv[2] || 30));
const intervalHours = Math.max(1, Number(process.argv[3] || 3));

// Open-Meteo's archive has a short quality-control lag, so "now" isn't
// available yet — anchor the window a few days back from today.
const ARCHIVE_LAG_DAYS = 3;

function calculateHeatIndexC(tempC, humidity) {
  const tempF = (tempC * 9) / 5 + 32;
  const hiF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity;

  const hiC = ((hiF - 32) * 5) / 9;
  return Number.isFinite(hiC) ? Math.max(hiC, tempC) : tempC;
}

function heatLevelFromIndex(heatIndexC) {
  if (heatIndexC < 27) return 'safe';
  if (heatIndexC < 32) return 'caution';
  if (heatIndexC < 41) return 'extreme-caution';
  if (heatIndexC < 54) return 'danger';
  return 'extreme-danger';
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchHistoricalWeather(startDate, endDate) {
  const { data } = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: toDateString(startDate),
      end_date: toDateString(endDate),
      hourly: 'temperature_2m,relative_humidity_2m',
      timezone: 'auto',
    },
  });

  return data;
}

async function run() {
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - ARCHIVE_LAG_DAYS);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

  console.log(`Fetching ${days} day(s) of real hourly weather from Open-Meteo (${toDateString(startDate)} to ${toDateString(endDate)})...`);

  const archive = await fetchHistoricalWeather(startDate, endDate);
  const times = archive?.hourly?.time || [];
  const temps = archive?.hourly?.temperature_2m || [];
  const humidities = archive?.hourly?.relative_humidity_2m || [];

  if (times.length === 0) {
    console.error('Open-Meteo returned no hourly data for this range.');
    process.exit(1);
  }

  let successCount = 0;

  for (let i = 0; i < times.length; i += intervalHours) {
    const temperatureC = temps[i];
    const humidityPercent = humidities[i];
    if (typeof temperatureC !== 'number' || typeof humidityPercent !== 'number') {
      continue;
    }

    const observedAt = new Date(times[i]);
    const heatIndexC = Number(calculateHeatIndexC(temperatureC, humidityPercent).toFixed(1));
    const heatLevel = heatLevelFromIndex(heatIndexC);
    const weatherId = randomUUID();

    const weatherInsert = await client.from('weather_data').insert({
      id: weatherId,
      school_id: schoolId,
      source: 'open-meteo-archive',
      location: 'Mayamot Elementary School',
      temperature_c: temperatureC,
      humidity_percent: humidityPercent,
      condition: 'historical',
      // The archive API's basic hourly fields don't include wind/pressure,
      // and the DB columns are NOT NULL — use neutral placeholders rather
      // than fabricating plausible-looking values for data we don't have.
      wind_speed_mps: 0,
      pressure_hpa: 1013,
      observed_at: observedAt.toISOString(),
      raw_payload: { temperatureC, humidityPercent, source: 'open-meteo-archive' },
      created_at: new Date().toISOString(),
    });

    if (weatherInsert.error) {
      console.error('weather_data insert failed at', observedAt.toISOString(), weatherInsert.error.message);
      continue;
    }

    const heatInsert = await client.from('heat_index_logs').insert({
      id: randomUUID(),
      school_id: schoolId,
      weather_data_id: weatherId,
      heat_index_c: heatIndexC,
      heat_level: heatLevel,
      observed_at: observedAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (heatInsert.error) {
      console.error('heat_index_logs insert failed at', observedAt.toISOString(), heatInsert.error.message);
      continue;
    }

    successCount += 1;
  }

  console.log(`Done. Inserted ${successCount} real historical weather/heat point(s) from Open-Meteo.`);
}

run().catch((error) => {
  console.error('Seed-from-Open-Meteo script failed:', error?.response?.data || error.message || error);
  process.exit(1);
});
