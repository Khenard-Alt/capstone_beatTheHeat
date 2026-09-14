/*
  Import REAL historical weather data (temperature, humidity, wind, pressure)
  for the school's location from Open-Meteo's free historical archive API
  (no API key required) and store it as weather_data + heat_index_logs rows.

  Usage from backend folder: node scripts/import-real-weather-history.js [days] [strideHours]
  Example: node scripts/import-real-weather-history.js 7 3
*/
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
const axios = require('axios');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const lat = Number(process.env.SCHOOL_LAT);
const lon = Number(process.env.SCHOOL_LON);
const locationName = process.env.SCHOOL_LOCATION_NAME || 'Mayamot Elementary School';
const schoolId = process.env.SEED_SCHOOL_ID || '00000000-0000-0000-0000-000000000001';

const days = Number(process.argv[2] || 7);
const strideHours = Number(process.argv[3] || 3);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}
if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
  console.error('Missing SCHOOL_LAT / SCHOOL_LON in backend/.env');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

// WMO weather codes -> short condition text (Open-Meteo uses WMO codes)
function conditionFromCode(code) {
  if (code === 0) return 'clear sky';
  if (code <= 3) return 'partly cloudy';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain showers';
  if (code <= 99) return 'thunderstorm';
  return 'cloudy';
}

async function fetchHistory() {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  // Archive API only has confirmed data up to ~yesterday.
  const endDate = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const { data } = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: fmt(start),
      end_date: fmt(endDate),
      hourly: 'temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,surface_pressure',
      timezone: 'Asia/Manila',
    },
    timeout: 15000,
  });

  return data;
}

async function run() {
  console.log(`Fetching real historical weather for ${locationName} (${lat}, ${lon}), last ${days} day(s)...`);
  const data = await fetchHistory();

  const times = data.hourly?.time || [];
  const temps = data.hourly?.temperature_2m || [];
  const humidities = data.hourly?.relative_humidity_2m || [];
  const codes = data.hourly?.weathercode || [];
  const winds = data.hourly?.windspeed_10m || [];
  const pressures = data.hourly?.surface_pressure || [];

  let successCount = 0;

  for (let i = 0; i < times.length; i += strideHours) {
    const temp = temps[i];
    const humidity = humidities[i];
    if (typeof temp !== 'number' || typeof humidity !== 'number') continue;

    const observedAt = new Date(`${times[i]}:00+08:00`);
    const heatIndex = Number(calculateHeatIndexC(temp, humidity).toFixed(1));
    const heatLevel = heatLevelFromIndex(heatIndex);
    const windSpeedMps = Number(((winds[i] ?? 0) / 3.6).toFixed(1)); // km/h -> m/s
    const pressureHpa = Number((pressures[i] ?? 1010).toFixed(0));
    const condition = conditionFromCode(codes[i] ?? 0);

    const weatherId = randomUUID();

    const weatherInsert = await client.from('weather_data').insert({
      id: weatherId,
      school_id: schoolId,
      source: 'open-meteo-archive',
      location: locationName,
      temperature_c: temp,
      humidity_percent: Math.round(humidity),
      condition,
      wind_speed_mps: windSpeedMps,
      pressure_hpa: pressureHpa,
      observed_at: observedAt.toISOString(),
      raw_payload: { time: times[i], temp, humidity, weathercode: codes[i], windspeed: winds[i], pressure: pressures[i] },
      created_at: new Date().toISOString(),
    });

    if (weatherInsert.error) {
      console.error('weather_data insert failed at', times[i], weatherInsert.error.message);
      continue;
    }

    const heatInsert = await client.from('heat_index_logs').insert({
      id: randomUUID(),
      school_id: schoolId,
      weather_data_id: weatherId,
      heat_index_c: heatIndex,
      heat_level: heatLevel,
      observed_at: observedAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (heatInsert.error) {
      console.error('heat_index_logs insert failed at', times[i], heatInsert.error.message);
      continue;
    }

    successCount += 1;
  }

  console.log(`Import complete. Inserted ${successCount} REAL historical weather/heat points from Open-Meteo.`);
  console.log(`Config: days=${days}, strideHours=${strideHours}, schoolId=${schoolId}, location=${locationName}`);
}

run().catch((error) => {
  console.error('Import script failed:', error.response?.data || error.message || error);
  process.exit(1);
});
