import { aiAnalysisService } from '../src/services/aiAnalysis.service';
import { AdvisoryInput } from '../src/types';
import { writeFile } from 'fs/promises';
import path from 'path';

async function run() {
  const samples = [
    {
      source: 'fallback',
      location: 'Mayamot Elementary School',
      temperatureC: 34.2,
      humidityPercent: 71,
      condition: 'partly cloudy',
      windSpeedMps: 2.8,
      pressureHpa: 1008,
      heatIndexC: 48,
      heatLevel: 'danger',
      timestamp: new Date().toISOString(),
    },
    {
      source: 'openweathermap',
      location: 'Valenzuela',
      temperatureC: 25.3,
      humidityPercent: 73,
      condition: 'few clouds',
      windSpeedMps: 2.1,
      pressureHpa: 1010,
      heatIndexC: 26.4,
      heatLevel: 'safe',
      timestamp: new Date().toISOString(),
    },
  ];

  // Define authoritative coverage list for COPE (only Mayamot/Antipolo)
  const coveredLocations = [
    'Mayamot Elementary School',
    'Mayamot Elementary School, Antipolo City',
    'Mayamot'
  ];

  const outputs: Array<{ location: string; heatIndexC: number; heatLevel: string; advisory: any }> = [];

  for (const w of samples) {
    // Skip samples that are outside COPE coverage
    const isCovered = coveredLocations.some(cl => (w.location || '').toLowerCase().includes(cl.toLowerCase()));
    if (!isCovered) {
      console.log(`Skipping out-of-scope location: ${w.location}`);
      continue;
    }
    const input: AdvisoryInput = {
      query: 'Generate a detailed, health-focused advisory for teachers, clinic staff, and parents. Include role-specific checklists and escalation criteria.',
      weather: w as any,
      lang: 'english',
    };

    console.log('\n--- Generating advisory for:', w.location, 'heatIndexC=', w.heatIndexC, 'heatLevel=', w.heatLevel);
    let res = await aiAnalysisService.generateScopedAdvisory(input);

    const hd = (res as any).healthDetails || (res as any).advisory?.healthDetails || null;
    if (!hd || (Array.isArray(hd.teacherChecklist) && hd.teacherChecklist.length < 10)) {
      console.log('Model returned a concise healthDetails payload; leaving it unchanged so the advisory stays model-driven.');
    }

    console.log(JSON.stringify(res, null, 2));
    outputs.push({ location: w.location, heatIndexC: w.heatIndexC, heatLevel: w.heatLevel, advisory: res });
  }

  try {
    await writeFile(path.join(process.cwd(), 'logs', 'latest-advisories.json'), JSON.stringify(outputs, null, 2), 'utf-8');
    console.log('Wrote latest advisories to logs/latest-advisories.json');
  } catch (err) {
    console.error('Failed to write latest advisories file:', err);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
