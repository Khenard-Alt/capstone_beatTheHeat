require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const schoolId = process.env.SEED_SCHOOL_ID || '00000000-0000-0000-0000-000000000001';
const days = Number(process.argv[2] || 10);
const intervalHours = Number(process.argv[3] || 3);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
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

function generateRealisticWeather(date, dayOffset) {
  const hour = date.getHours();

  const dailyCycle = Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const trendCycle = Math.sin((dayOffset / 10) * Math.PI);
  const seededNoise = Math.sin(date.getTime() / 100000000) * 0.8;

  const temperatureC = 31 + dailyCycle * 4.8 + trendCycle * 1.7 + seededNoise;
  const humidityPercent = 73 - dailyCycle * 8 + trendCycle * 4 + seededNoise * 2;

  const temp = Math.max(24, Math.min(40, Number(temperatureC.toFixed(1))));
  const humidity = Math.max(50, Math.min(92, Math.round(humidityPercent)));
  const heatIndex = Number(calculateHeatIndexC(temp, humidity).toFixed(1));

  return {
    source: 'seed',
    location: 'Mayamot Elementary School',
    temperatureC: temp,
    humidityPercent: humidity,
    condition: hour >= 10 && hour <= 16 ? 'sunny' : 'partly cloudy',
    windSpeedMps: Number((2 + Math.abs(Math.sin(hour)) * 2.2).toFixed(1)),
    pressureHpa: Number((1007 + Math.sin(hour / 3) * 3).toFixed(0)),
    heatIndexC: heatIndex,
    heatLevel: heatLevelFromIndex(heatIndex),
    timestamp: date.toISOString(),
  };
}

async function run() {
  const now = new Date();
  const totalPoints = Math.floor((days * 24) / intervalHours);

  let successCount = 0;

  for (let i = totalPoints - 1; i >= 0; i -= 1) {
    const hoursAgo = i * intervalHours;
    const observedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const dayOffset = Math.floor(hoursAgo / 24);
    const weather = generateRealisticWeather(observedAt, dayOffset);

    const weatherId = randomUUID();

    const weatherInsert = await client.from('weather_data').insert({
      id: weatherId,
      school_id: schoolId,
      source: weather.source,
      location: weather.location,
      temperature_c: weather.temperatureC,
      humidity_percent: weather.humidityPercent,
      condition: weather.condition,
      wind_speed_mps: weather.windSpeedMps,
      pressure_hpa: weather.pressureHpa,
      observed_at: weather.timestamp,
      raw_payload: weather,
      created_at: new Date().toISOString(),
    });

    if (weatherInsert.error) {
      console.error('weather_data insert failed at', weather.timestamp, weatherInsert.error.message);
      continue;
    }

    const heatInsert = await client.from('heat_index_logs').insert({
      id: randomUUID(),
      school_id: schoolId,
      weather_data_id: weatherId,
      heat_index_c: weather.heatIndexC,
      heat_level: weather.heatLevel,
      observed_at: weather.timestamp,
      created_at: new Date().toISOString(),
    });

    if (heatInsert.error) {
      console.error('heat_index_logs insert failed at', weather.timestamp, heatInsert.error.message);
      continue;
    }

    successCount += 1;
  }

  console.log(`Seed complete. Inserted ${successCount} historical weather/heat points.`);
  console.log(`Config: days=${days}, intervalHours=${intervalHours}, schoolId=${schoolId}`);
}

run().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
