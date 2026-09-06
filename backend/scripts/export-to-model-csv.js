#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

// Convert training_export.jsonl -> model_training.csv for ai.py training
async function main() {
  const args = process.argv.slice(2);
  const input = args[0] || path.resolve(process.cwd(), 'data', 'training_export.jsonl');
  const out = args[1] || path.resolve(process.cwd(), 'data', 'model_training.csv');
  const balance = args.includes('--balance');
  const balanceTargetArg = args.find((arg) => arg.startsWith('--balance-target='));
  const balanceTarget = balanceTargetArg ? Number(balanceTargetArg.split('=')[1]) : 25;
  const targetLevels = ['safe', 'caution', 'extreme-caution', 'danger', 'extreme-danger'];

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

  let finalRows = rows;
  if (balance) {
    const groups = new Map();
    for (const row of rows) {
      const level = String(row.heat_level || '').trim() || 'unknown';
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level).push(row);
    }

    const validGroups = [...groups.entries()].filter(([, groupRows]) => groupRows.length > 0);
    const target = Number.isFinite(balanceTarget) && balanceTarget > 0
      ? Math.floor(balanceTarget)
      : Math.max(1, Math.min(...validGroups.map(([, groupRows]) => groupRows.length)));

    const sampled = [];
    const sortedByHeat = [...rows].sort((a, b) => Number(b.heat_index_c || 0) - Number(a.heat_index_c || 0));
    const synthesizeRow = (base, level) => {
      const clone = { ...base };
      clone.heat_level = level;

      if (level === 'extreme-danger') {
        clone.heat_index_c = Math.max(Number(base.heat_index_c || 0) + 4, 50.5);
        clone.temperature_c = Number(base.temperature_c || 0) + 1;
        clone.humidity_percent = Math.min(100, Number(base.humidity_percent || 0) + 2);
      } else if (level === 'danger') {
        clone.heat_index_c = Math.max(Number(base.heat_index_c || 0), 40.5);
      } else if (level === 'extreme-caution') {
        clone.heat_index_c = Math.max(Number(base.heat_index_c || 0), 37.5);
      } else if (level === 'caution') {
        clone.heat_index_c = Math.max(Number(base.heat_index_c || 0), 31.5);
      } else {
        clone.heat_index_c = Math.min(Number(base.heat_index_c || 0), 29.5);
      }

      return clone;
    };

    for (const [level, groupRows] of validGroups) {
      const pool = [...groupRows];
      if (pool.length >= target) {
        pool.sort(() => Math.random() - 0.5);
        sampled.push(...pool.slice(0, target));
      } else {
        sampled.push(...pool);
        while (sampled.filter((row) => String(row.heat_level || '').trim() === level).length < target) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          sampled.push({ ...pick });
        }
      }
    }

    for (const level of targetLevels) {
      const current = sampled.filter((row) => String(row.heat_level || '').trim() === level).length;
      if (current >= target) continue;

      const sourcePool = groups.get(level)?.length ? groups.get(level) : sortedByHeat;
      const baseRows = sourcePool && sourcePool.length ? sourcePool : rows;
      let offset = 0;
      while (sampled.filter((row) => String(row.heat_level || '').trim() === level).length < target) {
        const base = baseRows[offset % baseRows.length];
        sampled.push(synthesizeRow(base, level));
        offset += 1;
      }
    }

    finalRows = sampled;
    console.log('Balanced classes to target rows per class:', target);
  }

  const header = ['temperature_c','humidity_percent','wind_speed_mps','pressure_hpa','heat_index_c','heat_level','observed_at'];
  const csv = [header.join(',')];
  for (const r of finalRows) {
    const row = header.map((h) => {
      const v = r[h] ?? '';
      if (v === null || v === undefined) return '';
      return String(v).includes(',') ? '"' + String(v).replace(/"/g,'""') + '"' : String(v);
    }).join(',');
    csv.push(row);
  }

  await fs.writeFile(out, csv.join('\n'), 'utf8');
  console.log('Wrote', finalRows.length, 'rows to', out);
}

main().catch(err => { console.error(err); process.exit(1); });
