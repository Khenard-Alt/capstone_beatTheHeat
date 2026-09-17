import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { AdvisoryAlert } from '../../components/AdvisoryAlert';
import type { HealthAdvisory as HealthAdvisoryType } from '../../types';
import { DEPED_RECOMMENDATIONS } from '../../utils/constants';
import { apiClient } from '../../services/api';
import '../../styles/HealthAdvisory.css';

const formatHeatLevelLabel = (value: string): string =>
  value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDateTime = (value?: string): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
};

const ACTIVE_ADVISORIES_PAGE_SIZE = 10;

const PrincipalAdvisories: React.FC = () => {
  const [advisories, setAdvisories] = useState<HealthAdvisoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingAdvisory, setViewingAdvisory] = useState<HealthAdvisoryType | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const fetchAdvisories = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/health-advisories', {
          params: { limit: 100, offset: 0 },
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

  const activeTotalPages = Math.max(1, Math.ceil(activeAdvisories.length / ACTIVE_ADVISORIES_PAGE_SIZE));
  const pagedActiveAdvisories = activeAdvisories.slice(
    (activePage - 1) * ACTIVE_ADVISORIES_PAGE_SIZE,
    activePage * ACTIVE_ADVISORIES_PAGE_SIZE
  );

  useEffect(() => {
    if (activePage > activeTotalPages) {
      setActivePage(activeTotalPages);
    }
  }, [activePage, activeTotalPages]);

  const historyTotalPages = Math.max(1, Math.ceil(historyAdvisories.length / ACTIVE_ADVISORIES_PAGE_SIZE));
  const pagedHistoryAdvisories = historyAdvisories.slice(
    (historyPage - 1) * ACTIVE_ADVISORIES_PAGE_SIZE,
    historyPage * ACTIVE_ADVISORIES_PAGE_SIZE
  );

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const toPercent = (value?: number): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }

    return Math.round(Math.max(0, Math.min(1, value)) * 100);
  };

  return (
    <div id="heat-data-top">
      <div className="admin-dashboard-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>Advisories</h1>
          <p>View the latest heat safety advisories and AI-generated evidence for your school.</p>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading && <div className="loading-state">Loading advisories...</div>}

      {!loading && activeAdvisories.length > 0 && (
        <div className="advisory-section">
          <h2>Active Advisories</h2>
          <div className="advisory-table-wrap table-wrap">
            <table className="advisory-table app-table">
              <thead>
                <tr>
                  <th scope="col">Issued</th>
                  <th scope="col">Heat Level</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Summary</th>
                </tr>
              </thead>
              <tbody>
                {pagedActiveAdvisories.map((advisory) => (
                  <tr
                    key={advisory.id}
                    onClick={() => setViewingAdvisory(advisory)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setViewingAdvisory(advisory);
                      }
                    }}
                  >
                    <td data-label="Issued">{formatDateTime(advisory.createdAt)}</td>
                    <td data-label="Heat Level">
                      <span className={`advisory-level badge-${advisory.heatLevel}`}>
                        {formatHeatLevelLabel(advisory.heatLevel)}
                      </span>
                    </td>
                    <td data-label="Risk" className={`advisory-risk risk-${advisory.riskLevel}`}>
                      {formatHeatLevelLabel(advisory.riskLevel)}
                    </td>
                    <td data-label="Summary" style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {advisory.advisoryText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Showing {(activePage - 1) * ACTIVE_ADVISORIES_PAGE_SIZE + 1}–
              {Math.min(activePage * ACTIVE_ADVISORIES_PAGE_SIZE, activeAdvisories.length)} of {activeAdvisories.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setActivePage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: activePage === 1 ? '#94a3b8' : '#1e293b',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                Prev
              </button>
              {Array.from({ length: activeTotalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setActivePage(page)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: page === activePage ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: page === activePage ? '#2563eb' : '#fff',
                    color: page === activePage ? '#fff' : '#1e293b',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: page === activePage ? 700 : 500,
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActivePage((page) => Math.min(activeTotalPages, page + 1))}
                disabled={activePage === activeTotalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: activePage === activeTotalPages ? '#94a3b8' : '#1e293b',
                  cursor: activePage === activeTotalPages ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                Next
              </button>
            </div>
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
        {!loading && historyAdvisories.length === 0 ? (
          <p className="empty-state-text">No recent advisories</p>
        ) : (
          <>
            <div className="advisory-table-wrap table-wrap">
              <table className="advisory-table app-table">
                <thead>
                  <tr>
                    <th scope="col">Issued</th>
                    <th scope="col">Heat Level</th>
                    <th scope="col">Risk</th>
                    <th scope="col">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistoryAdvisories.map((advisory) => (
                    <tr
                      key={advisory.id}
                      onClick={() => setViewingAdvisory(advisory)}
                      style={{ cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setViewingAdvisory(advisory);
                        }
                      }}
                    >
                      <td data-label="Issued">{formatDateTime(advisory.createdAt)}</td>
                      <td data-label="Heat Level">
                        <span className={`advisory-level badge-${advisory.heatLevel}`}>
                          {formatHeatLevelLabel(advisory.heatLevel)}
                        </span>
                      </td>
                      <td data-label="Risk" className={`advisory-risk risk-${advisory.riskLevel}`}>
                        {formatHeatLevelLabel(advisory.riskLevel)}
                      </td>
                      <td data-label="Summary" style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {advisory.advisoryText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Showing {(historyPage - 1) * ACTIVE_ADVISORIES_PAGE_SIZE + 1}–
                {Math.min(historyPage * ACTIVE_ADVISORIES_PAGE_SIZE, historyAdvisories.length)} of {historyAdvisories.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  disabled={historyPage === 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: historyPage === 1 ? '#94a3b8' : '#1e293b',
                    cursor: historyPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  Prev
                </button>
                {Array.from({ length: historyTotalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setHistoryPage(page)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: page === historyPage ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: page === historyPage ? '#2563eb' : '#fff',
                      color: page === historyPage ? '#fff' : '#1e293b',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: page === historyPage ? 700 : 500,
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                  disabled={historyPage === historyTotalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: historyPage === historyTotalPages ? '#94a3b8' : '#1e293b',
                    cursor: historyPage === historyTotalPages ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Card title="DepEd Heat Index Guidelines">
        <div className="guidelines">
          <div className="guideline-item">
            <div className="guideline-level guideline-normal">
              <strong>Normal (&lt; 27°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.normal.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-caution">
              <strong>Caution (27°C - 32°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.caution.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-extreme-caution">
              <strong>Extreme Caution (32°C - 41°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS['extreme-caution'].map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-danger">
              <strong>Danger (41°C - 54°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.danger.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-extreme-danger">
              <strong>Extreme Danger (&gt; 54°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS['extreme-danger'].map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {viewingAdvisory && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingAdvisory(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(640px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 22,
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
            }}
          >
            <AdvisoryAlert advisory={viewingAdvisory} onDismiss={() => setViewingAdvisory(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalAdvisories;
