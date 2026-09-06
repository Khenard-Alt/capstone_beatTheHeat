import type { HealthAdvisory, HeatLevel } from '../types';
import type { RealtimeAdvisoryResponse } from '../services/healthAdvisory.service';

const toHeatLevel = (value?: string): HeatLevel => {
  const normalized = String(value ?? 'normal').toLowerCase();
  if (normalized === 'extreme-danger' || normalized === 'danger') return normalized as HeatLevel;
  if (normalized === 'extreme-caution' || normalized === 'caution') return normalized as HeatLevel;
  return 'normal';
};

const toRiskLevel = (value?: string): HealthAdvisory['riskLevel'] => {
  const normalized = String(value ?? 'low').toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
};

const formatTitle = (heatLevel: HeatLevel): string => {
  const label = heatLevel
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return `Heat Safety Advisory: ${label}`;
};

export const mapRealtimeAdvisory = (advisory: RealtimeAdvisoryResponse): HealthAdvisory => {
  const heatLevel = toHeatLevel(advisory.decisionBasis?.heatLevel);
  const recommendations = [...(advisory.actions ?? []), ...(advisory.safetyTips ?? [])].filter(Boolean);

  return {
    id: `realtime-${advisory.generatedAt}`,
    schoolId: 'school-1',
    heatLevel,
    title: formatTitle(heatLevel),
    advisoryText: advisory.summary,
    recommendations,
    riskLevel: toRiskLevel(advisory.riskLevel),
    createdAt: advisory.generatedAt,
    confidenceScore: advisory.confidenceScore,
    modelScope: advisory.modelProfile?.scope,
    modelMode: advisory.modelProfile?.mode,
    decisionBasis: advisory.decisionBasis,
  };
};
