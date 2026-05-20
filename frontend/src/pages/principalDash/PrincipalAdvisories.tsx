import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { AdvisoryAlert } from '../../components/AdvisoryAlert';
import type { HealthAdvisory as HealthAdvisoryType } from '../../types';
import { DEPED_RECOMMENDATIONS } from '../../utils/constants';
import { apiClient } from '../../services/api';
import '../../styles/HealthAdvisory.css';

const PrincipalAdvisories: React.FC = () => {
  const [advisories, setAdvisories] = useState<HealthAdvisoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvisories = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/health-advisories', {
          params: { limit: 20, offset: 0 },
        });

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
        console.error('Failed to fetch principal advisories:', err);
        setError('Failed to load advisories');
        setAdvisories([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchAdvisories();
  }, []);

  const activeAdvisories = advisories.filter((advisory) => advisory.heatLevel !== 'normal' && advisory.riskLevel !== 'low');
  const historyAdvisories = advisories.filter((advisory) => advisory.heatLevel === 'normal' || advisory.riskLevel === 'low');
  const latestEvidence = advisories[0];

  const toPercent = (value?: number): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }

    return Math.round(Math.max(0, Math.min(1, value)) * 100);
  };

  return (
    <div>
      <div className="admin-dashboard-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>Advisories</h1>
          <p>Parent-style AI advisories and heat safety guidance inside the announcement section.</p>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading && <div className="loading-state">Loading advisories...</div>}

      {!loading && activeAdvisories.length > 0 && (
        <div className="advisory-section">
          <h2>Active Advisories</h2>
          <div className="advisory-list">
            {activeAdvisories.map((advisory) => (
              <AdvisoryAlert key={advisory.id} advisory={advisory} />
            ))}
          </div>
        </div>
      )}

      {!loading && latestEvidence && (
        <Card title="AI Advisory Evidence Panel">
          <div className="ai-evidence-panel">
            <div className="evidence-grid">
              <div className="evidence-item">
                <span className="evidence-label">Model Mode</span>
                <strong>{latestEvidence.modelMode || 'rule-grounded-ai'}</strong>
              </div>
              <div className="evidence-item">
                <span className="evidence-label">Scope</span>
                <strong>{latestEvidence.modelScope || 'system-only'}</strong>
              </div>
              <div className="evidence-item">
                <span className="evidence-label">Confidence</span>
                <strong>{toPercent(latestEvidence.confidenceScore)}%</strong>
              </div>
              <div className="evidence-item">
                <span className="evidence-label">Heat Index Basis</span>
                <strong>{latestEvidence.decisionBasis?.heatIndexC ?? 'N/A'}°C</strong>
              </div>
              <div className="evidence-item">
                <span className="evidence-label">Temperature</span>
                <strong>{latestEvidence.decisionBasis?.temperatureC ?? 'N/A'}°C</strong>
              </div>
              <div className="evidence-item">
                <span className="evidence-label">Humidity</span>
                <strong>{latestEvidence.decisionBasis?.humidityPercent ?? 'N/A'}%</strong>
              </div>
            </div>

            <div className="evidence-rationale">
              <h4>AI Rationale</h4>
              <ul>
                {(latestEvidence.decisionBasis?.rationale?.length
                  ? latestEvidence.decisionBasis.rationale
                  : ['Advisory is generated from in-system weather and computed heat-index levels only.']
                ).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="advisory-section">
        <h2>Recent Advisories {!loading && `(${historyAdvisories.length})`}</h2>
        <div className="advisory-list">
          {historyAdvisories.map((advisory) => (
            <AdvisoryAlert key={advisory.id} advisory={advisory} />
          ))}
          {!loading && historyAdvisories.length === 0 && (
            <p className="empty-state-text">No recent advisories</p>
          )}
        </div>
      </div>

      <Card title="DepEd Heat Index Guidelines">
        <div className="guidelines">
          <div className="guideline-item">
            <div className="guideline-level guideline-normal">
              <strong>Normal (27°C - 32°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.normal.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-caution">
              <strong>Caution (32°C - 41°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.caution.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-extreme-caution">
              <strong>Extreme Caution (41°C - 54°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS['extreme-caution'].map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-danger">
              <strong>Danger (&gt; 54°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.danger.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PrincipalAdvisories;
