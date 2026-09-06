#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

function ruleBasedRiskLevel(heatIndexC) {
  const hi = Number(heatIndexC ?? 0);
  if (hi >= 50) return 'extreme-danger';
  if (hi >= 40) return 'danger';
  if (hi >= 37) return 'extreme-caution';
  if (hi >= 31) return 'caution';
  return 'safe';
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function safeParseResponse(responseText) {
  if (!responseText) return null;
  if (typeof responseText === 'object') return responseText;
  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function distributionFromCounts(counts) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  const distribution = {};
  for (const [key, value] of Object.entries(counts)) {
    distribution[key] = value / total;
  }
  return distribution;
}

function distributionShift(current, baseline) {
  const labels = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  let total = 0;
  for (const label of labels) {
    total += Math.abs((current[label] || 0) - (baseline[label] || 0));
  }
  return total / 2;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || path.resolve(process.cwd(), 'logs', 'audit-events.jsonl');
  const outputPath = args[1] || path.resolve(process.cwd(), 'data', 'training_audit_report.json');

  let compareReportPath = null;
  let driftThreshold = 0.2;
  let failOnDrift = false;

  for (let index = 2; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--compare-report') {
      compareReportPath = args[index + 1] || null;
      index += 1;
    } else if (arg === '--drift-threshold') {
      driftThreshold = Number(args[index + 1] || driftThreshold);
      index += 1;
    } else if (arg === '--fail-on-drift') {
      failOnDrift = true;
    }
  }

  const raw = await fs.readFile(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const seen = new Set();
  const labelCounts = { safe: 0, caution: 0, 'extreme-caution': 0, danger: 0, 'extreme-danger': 0 };
  const heatLabelCounts = { safe: 0, caution: 0, 'extreme-caution': 0, danger: 0, 'extreme-danger': 0 };
  const sources = {};
  const mismatches = [];
  const duplicateExamples = [];
  const parseFailures = [];
  let aiAnalysisCount = 0;
  let duplicateCount = 0;

  for (const line of lines) {
    const obj = parseJsonLine(line);
    if (!obj || obj.type !== 'ai_analysis' || !obj.payload) continue;

    aiAnalysisCount += 1;
    const payload = obj.payload || {};
    const weather = payload.weather || {};
    const response = safeParseResponse(payload.responseText);
    const responseRisk = response?.riskLevel || response?.heatLevel || null;
    const expectedRisk = ruleBasedRiskLevel(weather.heatIndexC);
    const dedupeKey = JSON.stringify({
      type: obj.type,
      schoolId: obj.schoolId ?? null,
      query: payload.query ?? '',
      weather: {
        source: weather.source ?? null,
        location: weather.location ?? null,
        temperatureC: weather.temperatureC ?? null,
        humidityPercent: weather.humidityPercent ?? null,
        heatIndexC: weather.heatIndexC ?? null,
        heatLevel: weather.heatLevel ?? null,
        timestamp: weather.timestamp ?? null,
      },
      responseText: typeof payload.responseText === 'string' ? payload.responseText : JSON.stringify(response ?? null),
      source: payload.source ?? obj.source ?? null,
    });

    if (seen.has(dedupeKey)) {
      duplicateCount += 1;
      if (duplicateExamples.length < 5) duplicateExamples.push(obj.id ?? null);
      continue;
    }
    seen.add(dedupeKey);

    const source = payload.source ?? obj.source ?? 'unknown';
    sources[source] = (sources[source] || 0) + 1;

    if (!response) {
      parseFailures.push(obj.id ?? null);
      continue;
    }

    if (responseRisk && labelCounts[responseRisk] !== undefined) {
      labelCounts[responseRisk] += 1;
    }

    if (weather.heatLevel && heatLabelCounts[weather.heatLevel] !== undefined) {
      heatLabelCounts[weather.heatLevel] += 1;
    }

    if (responseRisk && responseRisk !== expectedRisk) {
      mismatches.push({
        id: obj.id ?? null,
        responseRisk,
        expectedRisk,
        heatIndexC: weather.heatIndexC ?? null,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    inputPath,
    aiAnalysisCount,
    dedupedCount: seen.size,
    duplicateCount,
    duplicateExamples,
    parseFailures,
    sources,
    labelCounts,
    weatherLabelCounts: heatLabelCounts,
    labelAgreementRate: seen.size > 0 ? (seen.size - mismatches.length) / seen.size : 0,
    mismatches: mismatches.slice(0, 25),
    alerts: [],
  };

  if (compareReportPath) {
    const baseline = JSON.parse(await fs.readFile(compareReportPath, 'utf8'));
    const baselineCounts = baseline?.class_counts || baseline?.classCounts || baseline?.data?.class_counts || {};
    const currentDist = distributionFromCounts(labelCounts);
    const baselineDist = distributionFromCounts(baselineCounts);
    const shift = distributionShift(currentDist, baselineDist);
    report.comparison = {
      compareReportPath,
      baselineCounts,
      currentDistribution: currentDist,
      baselineDistribution: baselineDist,
      distributionShift: shift,
      driftThreshold,
      driftDetected: shift > driftThreshold,
    };
    if (shift > driftThreshold) {
      report.alerts.push(`Label distribution drift detected (${shift.toFixed(3)} > ${driftThreshold}).`);
    }
  }

  if (mismatches.length > 0) {
    report.alerts.push(`Found ${mismatches.length} label-quality mismatches against heat-index rules.`);
  }
  if (parseFailures.length > 0) {
    report.alerts.push(`Found ${parseFailures.length} rows with unparseable responses.`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Audited ${aiAnalysisCount} ai_analysis events.`);
  console.log(`Deduped rows: ${seen.size}; duplicates skipped: ${duplicateCount}.`);
  console.log(`Label agreement rate: ${(report.labelAgreementRate * 100).toFixed(1)}%.`);
  console.log(`Wrote audit report to ${outputPath}`);
  if (report.alerts.length > 0) {
    console.log('Alerts:');
    for (const alert of report.alerts) console.log(`- ${alert}`);
  }

  if (failOnDrift && report.comparison?.driftDetected) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});