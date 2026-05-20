import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeatIndexCard } from '../../components/HeatIndexCard';
import { WeatherWidget } from '../../components/WeatherWidget';
import { AdvisoryAlert } from '../../components/AdvisoryAlert';
import { Chart } from '../../components/Chart';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { fetchCurrentWeather } from '../../services/weather.service';
import { apiClient } from '../../services/api';
import AnnouncementModal from '../../components/AnnouncementModal';
import { formatDateTimeCompact, formatDateTimeGlobal } from '../../utils/formatters';
import type { HeatIndexData, WeatherData, HealthAdvisory } from '../../types';
import { calculateHeatIndex, getHeatLevel, getGreeting } from '../../utils/helpers';
import { CHART_COLORS, DEPED_RECOMMENDATIONS } from '../../utils/constants';
import '../../styles/AdminDashboard.css';

interface Trend {
  timestamp: string;
  count: number;
}

interface PrincipalStats {
  activeAdvisories: number;
  incidents: number;
  activeUsers: number;
  trend: Trend[];
}

interface IncidentTrend {
  date: string;
  count: number;
}

export const PrincipalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAnnouncementOpen, setAnnouncementOpen] = useState(false);

  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [principalStats, setPrincipalStats] = useState<PrincipalStats | null>(null);
  const [_incidentTrends, setIncidentTrends] = useState<IncidentTrend[]>([]);
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

        // Fetch principal stats
        const statsResponse = await apiClient.get('/api/principal/stats', {
          params: { period: 'today' },
        });

        if (statsResponse.data.success) {
          setPrincipalStats(statsResponse.data.stats);
        }

        // Fetch incident trends
        const trendsResponse = await apiClient.get('/api/principal/incident-trends', {
          params: { period: 'week' },
        });

        if (trendsResponse.data.success) {
          setIncidentTrends(trendsResponse.data.data || []);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch principal data:', err);
        setError('Failed to load principal dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // Refresh every 1 minute
    
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

  const localAdvisory = useMemo<HealthAdvisory>(() => {
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

  const advisory = localAdvisory;

  // Auto-notify parents when advisory reaches critical/high levels
  useEffect(() => {
    const shouldNotify = advisory && (advisory.riskLevel === 'critical' || advisory.heatLevel === 'danger' || advisory.heatLevel === 'extreme-danger');
    if (!shouldNotify) return;

    const notify = async () => {
      try {
        await apiClient.post('/api/notifications/broadcast-heat-alert', {
          schoolId: heatIndexData.schoolId,
          heatLevel: advisory.heatLevel,
          heatIndex: heatIndexData.heatIndex,
          recommendations: advisory.recommendations,
        });
      } catch (err) {
        console.warn('Failed to broadcast heat alert:', err);
      }
    };

    void notify();
  }, [advisory?.riskLevel, advisory?.heatLevel, heatIndexData]);

  const systemStats = [
    { label: 'Active Advisories', value: principalStats?.activeAdvisories || '0', note: 'This period' },
    { label: 'Heat Incidents', value: principalStats?.incidents || '0', note: 'This period' },
    { label: 'Active Users', value: principalStats?.activeUsers || '0', note: 'Connected' },
    { label: 'System Status', value: loading ? 'Loading...' : 'Healthy', note: 'All systems' },
  ];

  // Convert trend data for charts
  const advisoryTrend = (principalStats?.trend || [])
    .filter((t: Trend) => t && t.timestamp && t.count >= 0)
    .slice(0, 7)
    .map((t: Trend) => ({
      timestamp: formatDateTimeCompact(t.timestamp),
      fullTimestamp: formatDateTimeGlobal(t.timestamp),
      advisories: t.count || 0,
      incidents: Math.round((t.count || 0) * 1.5),
    }));

  const getTrendFullTime = (label: string): string => {
    return advisoryTrend.find((point) => point.timestamp === label)?.fullTimestamp ?? label;
  };

  const incidentSummary = [
    { type: 'Heat-related Incidents', count: principalStats?.incidents || 0 },
    { type: 'Active Advisories', count: principalStats?.activeAdvisories || 0 },
    { type: 'Monitored Schools', count: 1 },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Principal Dashboard - Overall Reports</h1>
          <p>{getGreeting()}, {user?.firstName}. System overview and incident trends for Mayamot Elementary School.</p>
        </div>
        <div className="admin-dashboard-badges">
          <span className="admin-badge">Principal</span>
          <span className="admin-badge admin-badge-muted">{loading ? 'Loading...' : 'Ready'}</span>
          <button className="btn btn-secondary" style={{ marginLeft: 12 }} onClick={() => setAnnouncementOpen(true)}>
            Create Announcement
          </button>
          <button className="btn btn-primary" style={{ marginLeft: 12 }} onClick={() => navigate('/principal/reports')}>
            Open Reports
          </button>
          <AnnouncementModal isOpen={isAnnouncementOpen} onClose={() => setAnnouncementOpen(false)} />
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

          <Card title="Advisory and Incident Trends">
            {advisoryTrend.length > 0 && (
              <Chart
                data={advisoryTrend}
                type="bar"
                dataKeys={[
                  { key: 'advisories', name: 'Advisories Issued', color: CHART_COLORS.heatIndex },
                  { key: 'incidents', name: 'Incidents Reported', color: CHART_COLORS.temperature },
                ]}
                xAxisKey="timestamp"
                xAxisAngle={-12}
                xAxisHeight={68}
                tooltipLabelFormatter={getTrendFullTime}
                height={260}
              />
            )}
            {advisoryTrend.length === 0 && (
              <div className="empty-state">No trend data available</div>
            )}
          </Card>
        </div>

        <div className="admin-dashboard-side">
          <Card title="Incident Summary">
            <div className="admin-incident-list">
              {incidentSummary.map((item) => (
                <div key={item.type} className="admin-incident-row">
                  <span>{item.type}</span>
                  <span className="admin-incident-count">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="principal-actions">
              <button className="btn btn-primary" style={{width: '100%', marginBottom: '8px'}}>
                Review Incident Trends
              </button>
              <button className="btn btn-secondary" style={{width: '100%'}}>
                Generate Report
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
