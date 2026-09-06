import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { AdvisoryAlert } from '../../components/AdvisoryAlert';
import { Chart } from '../../components/Chart';
import type { HealthAdvisory as HealthAdvisoryType } from '../../types';
import { DEPED_RECOMMENDATIONS, CHART_COLORS } from '../../utils/constants';
import { apiClient } from '../../services/api';
import { formatDateTimeCompact, formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/HealthAdvisory.css';

const PrincipalHeatData: React.FC = () => {
  const [advisories, setAdvisories] = useState<HealthAdvisoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/health-advisories', { params: { limit: 20, offset: 0 } });

        if (response.data.success && response.data.data) {
          const convertedAdvisories: HealthAdvisoryType[] = response.data.data.map((log: any) => {
            const heatLevel = String(log.safety_level || 'normal').toLowerCase();
            const safeHeatLevel = ['normal', 'caution', 'extreme-caution', 'danger', 'extreme-danger'].includes(heatLevel)
              ? heatLevel
              : 'normal';

            return {
              id: log.id,
              schoolId: 'school-1',
              heatLevel: safeHeatLevel as any,
              title: `Advisory - ${safeHeatLevel.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
              advisoryText: log.response || 'No advisory text available',
              recommendations: DEPED_RECOMMENDATIONS[safeHeatLevel as keyof typeof DEPED_RECOMMENDATIONS] || DEPED_RECOMMENDATIONS.normal,
              riskLevel: safeHeatLevel === 'normal' ? 'low' : safeHeatLevel === 'caution' ? 'medium' : 'high',
              createdAt: log.created_at,
              confidenceScore: typeof log.confidence_score === 'number' ? log.confidence_score : undefined,
              decisionBasis: log.decision_basis || undefined,
              modelMode: log.model_profile?.mode || undefined,
              modelScope: log.model_profile?.scope || undefined,
            };
          });

          setAdvisories(convertedAdvisories);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch principal heat data:', err);
        setError('Failed to load heat data');
        setAdvisories([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const latestAdvisory = advisories[0];
  const advisoryTrend = useMemo(() => {
    if (!advisories || advisories.length === 0) return [];

    // Group advisories into compact time buckets (by compact label)
    const buckets: Record<string, { fullTimestamp: string; count: number }> = {};

    advisories.slice(0, 20).forEach((a) => {
      const compact = formatDateTimeCompact(a.createdAt || new Date().toISOString());
      const full = formatDateTimeGlobal(a.createdAt || new Date().toISOString());
      if (!buckets[compact]) buckets[compact] = { fullTimestamp: full, count: 0 };
      buckets[compact].count += 1;
    });

    const points = Object.keys(buckets)
      .map((k) => ({ timestamp: k, fullTimestamp: buckets[k].fullTimestamp, advisories: buckets[k].count, notifications: Math.round(buckets[k].count * 2.5) }))
      .sort((a, b) => new Date(a.fullTimestamp).getTime() - new Date(b.fullTimestamp).getTime())
      .slice(-5);

    return points;
  }, [advisories]);
  const heatSummary = useMemo(() => {
    if (!latestAdvisory) {
      return 'No live advisory data is available right now.';
    }

    return latestAdvisory.heatLevel === 'normal'
      ? 'Conditions are currently within the normal range.'
      : `Current monitoring is at ${latestAdvisory.heatLevel.replace('-', ' ')}.`;
  }, [latestAdvisory]);

  return (
    <div>
      <div className="admin-dashboard-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>Heat Data</h1>
          <p>Parent-style monitoring view for the latest heat conditions and guidance.</p>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading && <div className="loading-state">Loading heat data...</div>}

      {!loading && latestAdvisory && (
        <Card title="Latest Heat Snapshot">
          <div style={{ display: 'grid', gap: 12, padding: 12 }}>
            <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{heatSummary}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              <div><strong>Heat level:</strong> {latestAdvisory.heatLevel.replace('-', ' ')}</div>
              <div><strong>Risk level:</strong> {latestAdvisory.riskLevel}</div>
              <div><strong>Confidence:</strong> {typeof latestAdvisory.confidenceScore === 'number' ? `${Math.round(latestAdvisory.confidenceScore * 100)}%` : 'N/A'}</div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <Card title="Recommended Actions">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Check class activity safety before outdoor movement.</li>
            <li>Keep hydration reminders visible for staff and parents.</li>
            <li>Use the advisory level to decide if schedules need adjustment.</li>
            <li>Escalate extreme heat conditions to the announcement flow.</li>
          </ul>
        </Card>

        {latestAdvisory && latestAdvisory.decisionBasis && (
          <Card title="Latest Advisory Basis">
            <div style={{ display: 'grid', gap: 12, padding: 12 }}>
              <div><strong>Model mode:</strong> {latestAdvisory.modelMode || 'rule-grounded-ai'}</div>
              <div><strong>Scope:</strong> {latestAdvisory.modelScope || 'system-only'}</div>
              <div><strong>Temperature:</strong> {latestAdvisory.decisionBasis.temperatureC ?? 'N/A'}°C</div>
              <div><strong>Humidity:</strong> {latestAdvisory.decisionBasis.humidityPercent ?? 'N/A'}%</div>
            </div>
          </Card>
        )}

        {!loading && advisories.length > 0 && (
          <Card title="Recent Heat Advisories">
            <div style={{ display: 'grid', gap: 12 }}>
              {advisories.slice(0, 3).map((advisory) => (
                <AdvisoryAlert key={advisory.id} advisory={advisory} />
              ))}
            </div>
          </Card>
        )}

        {advisoryTrend.length > 0 && (
          <Card title="Advisory and Notification Volume">
            <div>
              <Chart
                data={advisoryTrend}
                type="bar"
                dataKeys={[
                  { key: 'advisories', name: 'Advisories', color: CHART_COLORS.heatIndex },
                  { key: 'notifications', name: 'Notifications', color: CHART_COLORS.temperature },
                ]}
                xAxisKey="timestamp"
                xAxisAngle={-12}
                xAxisHeight={68}
                tooltipLabelFormatter={(label: string) => advisoryTrend.find((p: any) => p.timestamp === label)?.fullTimestamp ?? label}
                height={260}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PrincipalHeatData;
