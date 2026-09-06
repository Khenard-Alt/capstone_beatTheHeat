#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

// Simple export script: read audit-events.jsonl and export ai_analysis rows to JSONL and CSV
// Usage: node export-training.js [inputPath] [outDir] [--no-redact]

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || path.resolve(process.cwd(), 'logs', 'audit-events.jsonl');
  const outDir = args[1] || path.resolve(process.cwd(), 'data');
  const noRedact = args.includes('--no-redact');
  const broaden = args.includes('--broaden'); // include more records by skipping dedupe

  await fs.mkdir(outDir, { recursive: true });

  const raw = await fs.readFile(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const jsonlOut = [];
  const csvRows = [];
  const seen = new Set();
  let duplicateCount = 0;
  // CSV header
  csvRows.push(['id','created_at','query','weather_location','temperatureC','humidityPercent','heatIndexC','heatLevel','summary','actions','safetyTips','confidenceScore','source'].join(','));

  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      continue;
    }

    if (!obj || obj.type !== 'ai_analysis' || !obj.payload) continue;

    const id = obj.id ?? null;
    const createdAt = obj.createdAt ?? obj.created_at ?? null;
    const payload = obj.payload || {};
    const query = payload.query ?? '';
    const weather = payload.weather ?? {};
    const source = payload.source ?? obj.source ?? payload.model ?? null;

    // Parse responseText which is a JSON string
    let parsedResponse = null;
    try {
      parsedResponse = typeof payload.responseText === 'string' ? JSON.parse(payload.responseText) : payload.responseText;
    } catch (e) {
      parsedResponse = null;
    }

    const summary = parsedResponse?.summary ?? null;
    const actions = Array.isArray(parsedResponse?.actions) ? parsedResponse.actions : null;
    const safetyTips = Array.isArray(parsedResponse?.safetyTips) ? parsedResponse.safetyTips : null;
    const confidenceScore = typeof parsedResponse?.confidenceScore === 'number' ? parsedResponse.confidenceScore : null;

    const dedupeKey = JSON.stringify({
      type: obj.type,
      schoolId: obj.schoolId ?? null,
      query,
      weather: {
        source: weather.source ?? null,
        location: weather.location ?? null,
        temperatureC: weather.temperatureC ?? null,
        humidityPercent: weather.humidityPercent ?? null,
        heatIndexC: weather.heatIndexC ?? null,
        heatLevel: weather.heatLevel ?? null,
        // Intentionally omit timestamp when broadening to keep similar time-series rows
      },
      responseText: typeof payload.responseText === 'string' ? payload.responseText : JSON.stringify(parsedResponse ?? null),
      source,
    });
    if (!broaden) {
      if (seen.has(dedupeKey)) {
        duplicateCount += 1;
        continue;
      }
      seen.add(dedupeKey);
    }

    // Redact location by default
    const location = noRedact ? (weather.location ?? '') : (weather.location ? '<REDACTED_LOCATION>' : '');

    const outRecord = {
      id,
      createdAt,
      query,
      weather: {
        source: weather.source ?? null,
        location: location,
        temperatureC: weather.temperatureC ?? null,
        humidityPercent: weather.humidityPercent ?? null,
        heatIndexC: weather.heatIndexC ?? null,
        heatLevel: weather.heatLevel ?? null,
        timestamp: weather.timestamp ?? null,
      },
      summary,
      actions,
      safetyTips,
      confidenceScore,
      source,
    };

    jsonlOut.push(JSON.stringify(outRecord));

    // CSV row (escape commas and quotes)
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return '"' + s + '"';
    };

    csvRows.push([
      id,
      createdAt,
      esc(query),
      esc(location),
      weather.temperatureC ?? '',
      weather.humidityPercent ?? '',
      weather.heatIndexC ?? '',
      weather.heatLevel ?? '',
      esc(summary ?? ''),
      esc(actions ? actions.join(' | ') : ''),
      esc(safetyTips ? safetyTips.join(' | ') : ''),
      confidenceScore ?? '',
      esc(source ?? ''),
    ].join(','));
  }

  const outJsonlPath = path.join(outDir, 'training_export.jsonl');
  const outCsvPath = path.join(outDir, 'training_export.csv');

  await fs.writeFile(outJsonlPath, jsonlOut.join('\n'), 'utf8');
  await fs.writeFile(outCsvPath, csvRows.join('\n'), 'utf8');

  console.log('Exported', jsonlOut.length, 'records to', outJsonlPath, 'and', outCsvPath);
  if (duplicateCount > 0) {
    console.log('Skipped', duplicateCount, 'duplicate ai_analysis records during export.');
  }
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
