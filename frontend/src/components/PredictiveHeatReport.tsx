import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './Card';
import { Chart } from './Chart';
import { apiClient } from '../services/api';
import {
  HEAT_COLORS,
  HEAT_LABELS,
  DEPED_RECOMMENDATIONS,
  ROLE_HEAT_RECOMMENDATIONS,
  normalizeHeatLevel,
} from '../utils/constants';

type ReportRole = keyof (typeof ROLE_HEAT_RECOMMENDATIONS)['normal'];

interface PredictiveHeatReportProps {
  role: ReportRole;
  /** Compact mode drops the historical chart and forecast chart, keeping
   *  only current conditions + role actions + a simple upcoming-peak list —
   *  meant for parent/teacher views where the full analytics aren't needed. */
  compact?: boolean;
}

interface HistoryPoint {
  time: string;
  avgTemp: number;
  avgHumidity: number;
  avgHeatIndex: number;
  minHeatIndex: number;
  maxHeatIndex: number;
}

interface CurrentSnapshot {
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  heatLevel: string;
  timestamp: string;
}

interface ForecastDay {
  date: string;
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  heatLevel: string;
}

const MIN_HISTORY_POINTS = 5;

const formatShortDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatShortDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const PredictiveHeatReport: React.FC<PredictiveHeatReportProps> = ({ role, compact = false }) => {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [current, setCurrent] = useState<CurrentSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [historyRes, currentRes, forecastRes] = await Promise.all([
          compact
            ? Promise.resolve({ data: { data: [] } })
            : apiClient.get('/api/heat-index/history', { params: { period: 'weekly' } }),
          apiClient.get('/api/weather/current'),
          apiClient.get('/api/weather/forecast', { params: { days: 5 } }),
        ]);

        if (!mounted) return;

        setHistory(Array.isArray(historyRes.data?.data) ? historyRes.data.data : []);

        const weather = currentRes.data?.data;
        if (weather) {
          setCurrent({
            temperatureC: weather.temperatureC ?? weather.temperature ?? 0,
            humidityPercent: weather.humidityPercent ?? weather.humidity ?? 0,
            heatIndexC: weather.heatIndexC ?? weather.feelsLike ?? 0,
            heatLevel: weather.heatLevel ?? 'normal',
            timestamp: weather.timestamp ?? new Date().toISOString(),
          });
        }

        setForecast(Array.isArray(forecastRes.data?.data?.days) ? forecastRes.data.data.days : []);
      } catch (error) {
        console.error('Failed to load predictive heat report:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const peakHistoryPoint = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce((peak, point) => (point.maxHeatIndex > peak.maxHeatIndex ? point : peak), history[0]);
  }, [history]);

  const upcomingPeakDays = useMemo(
    () => forecast.filter((day) => normalizeHeatLevel(day.heatLevel) !== 'normal'),
    [forecast]
  );

  const currentLevel = normalizeHeatLevel(current?.heatLevel);
  const currentColor = HEAT_COLORS[currentLevel];
  const currentActions = ROLE_HEAT_RECOMMENDATIONS[currentLevel][role];
  const currentGenericTips = DEPED_RECOMMENDATIONS[currentLevel];

  return (
    <div className={`predictive-report ${compact ? 'predictive-report-compact' : ''}`}>
      <div className="predictive-report-header">
        <div>
          <h2>{compact ? 'Heat Safety Outlook' : 'Predictive Heat Report'}</h2>
          <p>
            {compact
              ? 'Current conditions and what to do, based on the latest school heat data.'
              : 'Previous patterns, current conditions, and the upcoming forecast for this school.'}
          </p>
        </div>
        <div className="predictive-legend">
          {(Object.keys(HEAT_LABELS) as Array<keyof typeof HEAT_LABELS>).map((level) => (
            <span key={level} className="predictive-legend-chip" style={{ background: HEAT_COLORS[level] }}>
              {HEAT_LABELS[level]}
            </span>
          ))}
        </div>
      </div>

      <div className="predictive-report-grid">
        {!compact && (
        <Card title="Previous Analysis" className="predictive-card">
          {loading ? (
            <div className="predictive-loading">Loading historical data…</div>
          ) : history.length < MIN_HISTORY_POINTS ? (
            <div className="predictive-empty-state">
              Limited historical data available yet — the system is still collecting heat index readings.
              Check back once more readings have been logged for a fuller peak-pattern analysis.
            </div>
          ) : (
            <>
              <Chart
                data={history}
                type="area"
                dataKeys={[{ key: 'maxHeatIndex', name: 'Peak Heat Index (°C)', color: HEAT_COLORS.danger }]}
                xAxisKey="time"
                height={220}
                xAxisTickFormatter={formatShortDateTime}
                tooltipLabelFormatter={formatShortDateTime}
              />
              {peakHistoryPoint && (
                <p className="predictive-insight">
                  Recurring peak: heat index reached{' '}
                  <strong>{peakHistoryPoint.maxHeatIndex.toFixed(1)}°C</strong> around{' '}
                  {formatShortDateTime(peakHistoryPoint.time)}.
                </p>
              )}
            </>
          )}
        </Card>
        )}

        <Card title="Current Analysis" className="predictive-card">
          {loading || !current ? (
            <div className="predictive-loading">Loading current conditions…</div>
          ) : (
            <>
              <div className="predictive-current-stats">
                <div className="predictive-stat">
                  <span className="predictive-stat-label">Temperature</span>
                  <span className="predictive-stat-value">{current.temperatureC.toFixed(1)}°C</span>
                </div>
                <div className="predictive-stat">
                  <span className="predictive-stat-label">Humidity</span>
                  <span className="predictive-stat-value">{current.humidityPercent.toFixed(0)}%</span>
                </div>
                <div className="predictive-stat">
                  <span className="predictive-stat-label">Heat Index</span>
                  <span className="predictive-stat-value">{current.heatIndexC.toFixed(1)}°C</span>
                </div>
                <div className="predictive-stat">
                  <span className="predictive-stat-label">Risk Level</span>
                  <span className="predictive-badge" style={{ background: currentColor }}>
                    {HEAT_LABELS[currentLevel]}
                  </span>
                </div>
              </div>
              <div className="predictive-actions">
                <span className="predictive-actions-label">Recommended actions for you</span>
                <ul>
                  {currentActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <details className="predictive-generic-tips">
                <summary>General DepEd guidance for this level</summary>
                <ul>
                  {currentGenericTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </Card>

        <Card title="Future Analysis" className="predictive-card">
          {loading ? (
            <div className="predictive-loading">Loading forecast…</div>
          ) : forecast.length === 0 ? (
            <div className="predictive-empty-state">Forecast data is unavailable right now.</div>
          ) : (
            <>
              <Chart
                data={forecast}
                type="bar"
                dataKeys={[{ key: 'heatIndexC', name: 'Forecast Heat Index (°C)', color: HEAT_COLORS['extreme-caution'] }]}
                xAxisKey="date"
                height={compact ? 180 : 220}
                xAxisTickFormatter={formatShortDate}
                tooltipLabelFormatter={formatShortDate}
              />
              {upcomingPeakDays.length > 0 ? (
                <div className="predictive-actions">
                  <span className="predictive-actions-label">Upcoming peak-heat days</span>
                  <ul>
                    {upcomingPeakDays.map((day) => {
                      const level = normalizeHeatLevel(day.heatLevel);
                      return (
                        <li key={day.date}>
                          <span className="predictive-badge predictive-badge-inline" style={{ background: HEAT_COLORS[level] }}>
                            {HEAT_LABELS[level]}
                          </span>{' '}
                          {formatShortDate(day.date)} — {day.heatIndexC.toFixed(1)}°C expected
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="predictive-insight">No caution-level or higher days expected in the next {forecast.length} days.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
