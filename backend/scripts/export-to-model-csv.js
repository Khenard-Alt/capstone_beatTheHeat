#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

// Convert training_export.jsonl -> model_training.csv for ai.py training
async function main() {
  const args = process.argv.slice(2);
  const input = args[0] || path.resolve(process.cwd(), 'data', 'training_export.jsonl');
  const out = args[1] || path.resolve(process.cwd(), 'data', 'model_training.csv');

  const raw = await fs.readFile(input, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const rows = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const w = obj.weather || {};
      const heatLevel = obj.summary ? (obj.weather?.heatLevel || obj.weather?.heat_level || obj.riskLevel || null) : (w.heatLevel || w.heat_level || null);
      rows.push({
        temperature_c: w.temperatureC ?? w.temperature_c ?? '',
        humidity_percent: w.humidityPercent ?? w.humidity_percent ?? '',
        wind_speed_mps: w.windSpeedMps ?? w.wind_speed_mps ?? '',
        pressure_hpa: w.pressureHpa ?? w.pressure_hpa ?? '',
        heat_index_c: w.heatIndexC ?? w.heat_index_c ?? '',
        heat_level: w.heatLevel ?? w.heat_level ?? obj.weather?.heatLevel ?? obj.riskLevel ?? '',
        observed_at: w.timestamp ?? obj.createdAt ?? obj.created_at ?? '',
      });
    } catch (e) {
      // skip
    }
  }

  const header = ['temperature_c','humidity_percent','wind_speed_mps','pressure_hpa','heat_index_c','heat_level','observed_at'];
  const csv = [header.join(',')];
  for (const r of rows) {
    const row = header.map((h) => {
      const v = r[h] ?? '';
      if (v === null || v === undefined) return '';
      return String(v).includes(',') ? '"' + String(v).replace(/"/g,'""') + '"' : String(v);
    }).join(',');
    csv.push(row);
  }

  await fs.writeFile(out, csv.join('\n'), 'utf8');
  console.log('Wrote', rows.length, 'rows to', out);
}

main().catch(err => { console.error(err); process.exit(1); });
