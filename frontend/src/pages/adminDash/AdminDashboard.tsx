import React, { useMemo, useState, useEffect } from 'react';
import { HeatIndexCard } from '../../components/HeatIndexCard';
import { WeatherWidget } from '../../components/WeatherWidget';
import { AdvisoryAlert } from '../../components/AdvisoryAlert';
import { Chart } from '../../components/Chart';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchCurrentWeather } from '../../services/weather.service';
import { apiClient } from '../../services/api';
import { formatDateTimeCompact, formatDateTimeGlobal } from '../../utils/formatters';
import type { HeatIndexData, WeatherData, HealthAdvisory } from '../../types';
import { calculateHeatIndex, getHeatLevel, getGreeting } from '../../utils/helpers';
import { CHART_COLORS, DEPED_RECOMMENDATIONS } from '../../utils/constants';
import '../../styles/AdminDashboard.css';

interface Trend {
  timestamp: string;
  count: number;
}

interface AdminStats {
  activeAdvisories: number;
  incidents: number;
  activeUsers: number;
  trend: Trend[];
}

interface ParentQuestionInsight {
  question: string;
  count: number;
  lastAskedAt: string;
  lastSource: string;
  lastModel: string;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [parentQuestionInsights, setParentQuestionInsights] = useState<ParentQuestionInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch weather
        const weatherData = await fetchCurrentWeather();
        if (weatherData) {
          setCurrentWeather(weatherData);
        }

        // Fetch admin stats
        const statsResponse = await apiClient.get('/api/admin/stats', {
          params: { period: 'today' },
        });

        if (statsResponse.data.success) {
          setAdminStats(statsResponse.data.stats);
        }

        const insightResponse = await apiClient.get('/api/admin/parent-questions', {
          params: { period: 'week', limit: 8 },
        });

        if (insightResponse.data.success) {
          setParentQuestionInsights(insightResponse.data.data || []);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000); // Refresh every 15 minutes
    
    return () => clearInterval(interval);
  }, []);

  const heatIndexData = useMemo<HeatIndexData>(() => {
    if (!currentWeather) {
      return {
        id: '1',
        schoolId: 'school-1',
        temperature: 0,
        humidity: 0,
        heatIndex: 0,
        level: 'normal' as const,
        timestamp: new Date().toISOString(),
      };
    }

    const heatIndex = calculateHeatIndex(currentWeather.temperature, currentWeather.humidity);
    const level = getHeatLevel(heatIndex);

    return {
      id: '1',
      schoolId: 'school-1',
      temperature: currentWeather.temperature,
      humidity: currentWeather.humidity,
      heatIndex,
      level,
      timestamp: new Date().toISOString(),
    };
  }, [currentWeather]);

  const advisory = useMemo<HealthAdvisory>(() => {
    const level = heatIndexData.level;
    return {
      id: '1',
      schoolId: 'school-1',
      heatLevel: level,
      title: `Heat Index Alert: ${level.toUpperCase().replace('-', ' ')}`,
      advisoryText: `Current heat index is ${heatIndexData.heatIndex.toFixed(1)}°C. Please follow the recommended safety measures.`,
      recommendations: DEPED_RECOMMENDATIONS[level],
      riskLevel: level === 'extreme-danger' || level === 'danger' ? 'critical' : level === 'extreme-caution' ? 'high' : 'medium',
      createdAt: new Date().toISOString(),
      createdBy: 'System',
    };
  }, [heatIndexData]);

  const systemStats = [
    { label: 'Active Advisories', value: adminStats?.activeAdvisories || '0', note: 'This period' },
    { label: 'Heat Incidents', value: adminStats?.incidents || '0', note: 'This period' },
    { label: 'Active Users', value: adminStats?.activeUsers || '0', note: 'Connected' },
    { label: 'System Status', value: loading ? 'Loading...' : 'Healthy', note: 'All systems' },
  ];

  // Convert trend data for charts
  const advisoryTrend = (adminStats?.trend || [])
    .filter((t: Trend) => t && t.timestamp && t.count >= 0)
    .slice(0, 5)
    .map((t: Trend) => ({
      timestamp: formatDateTimeCompact(t.timestamp),
      fullTimestamp: formatDateTimeGlobal(t.timestamp),
      advisories: t.count || 0,
      notifications: Math.round((t.count || 0) * 2.5),
    }));

  const getAdminTrendFullTime = (label: string): string => {
    return advisoryTrend.find((point) => point.timestamp === label)?.fullTimestamp ?? label;
  };

  const incidentSummary = [
    { type: 'Heat-related', count: adminStats?.incidents || 0 },
    { type: 'Preventive', count: adminStats?.activeAdvisories || 0 },
    { type: 'Pending', count: 0 },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>{getGreeting()}, {user?.firstName}. System overview for Mayamot Elementary School.</p>
        </div>
        <div className="admin-dashboard-badges">
          <span className="admin-badge">Admin Access</span>
          <span className="admin-badge admin-badge-muted">
            {loading ? 'Syncing...' : 'Last sync: just now'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <div className="admin-dashboard-stats">
        {systemStats.map((stat) => (
          <Card key={stat.label} className="admin-stat-card">
            <div className="admin-stat-label">{stat.label}</div>
            <div className="admin-stat-value">{stat.value}</div>
            <div className="admin-stat-note">{stat.note}</div>
          </Card>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-main">
          <div className="admin-dashboard-top">
            {currentWeather ? (
              <>
                <HeatIndexCard
                  heatIndex={heatIndexData.heatIndex}
                  temperature={heatIndexData.temperature}
                  humidity={heatIndexData.humidity}
                  level={heatIndexData.level}
                  lastUpdated={heatIndexData.timestamp}
                />
                <WeatherWidget weather={currentWeather} />
              </>
            ) : (
              <div className="loading-placeholder">Loading weather...</div>
            )}
          </div>

          <AdvisoryAlert advisory={advisory} />

          <Card title="Advisory and Notification Volume">
            {advisoryTrend.length > 0 && (
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
                tooltipLabelFormatter={getAdminTrendFullTime}
                height={260}
              />
            )}
            {advisoryTrend.length === 0 && (
              <div className="empty-state">No trend data available</div>
            )}
          </Card>
        </div>

        <div className="admin-dashboard-side">
          <Card title="Incident Summary (Today)">
            <div className="admin-incident-list">
              {incidentSummary.map((item) => (
                <div key={item.type} className="admin-incident-row">
                  <span>{item.type}</span>
                  <span className="admin-incident-count">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="System Notes">
            <ul className="admin-notes">
              <li>Weather fetch interval: 15 minutes</li>
              <li>Last advisory generation: 10 minutes ago</li>
              <li>Email queue: 2 pending</li>
              <li>SMS queue: 1 pending</li>
            </ul>
          </Card>

          <Card title="Most Asked Parent Questions (Week)">
            <div className="admin-question-insights">
              {parentQuestionInsights.length === 0 && (
                <div className="empty-state">No parent question insights yet</div>
              )}

              {parentQuestionInsights.map((item, index) => (
                <div key={`${item.question}-${index}`} className="admin-question-item">
                  <div className="admin-question-text">{item.question}</div>
                  <div className="admin-question-meta">
                    <span>Asked {item.count}x</span>
                    <span>{formatDateTimeCompact(item.lastAskedAt)}</span>
                    <span className={`admin-source-badge ${item.lastSource === 'gemini' ? 'gemini' : 'fallback'}`}>
                      {item.lastSource}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
