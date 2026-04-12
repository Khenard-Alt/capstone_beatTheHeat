import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Chart } from '../components/Chart';
import { Button } from '../components/Button';
import { formatDateTimeCompact, formatDateTimeGlobal } from '../utils/formatters';
import { getHeatLevel, getHeatLabel } from '../utils/helpers';
import { CHART_COLORS } from '../utils/constants';
import { apiClient } from '../services/api';
import '../styles/heatIndex.css';

interface HeatIndexData {
  time: string;
  displayTime: string;
  fullTime: string;
  avgTemp: number;
  avgHumidity: number;
  avgHeatIndex: number;
  minHeatIndex?: number;
  maxHeatIndex?: number;
}

export const HeatIndex: React.FC = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [data, setData] = useState<HeatIndexData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState({
    heatIndex: 0,
    max: 0,
    min: 0,
    avg: 0,
  });

  useEffect(() => {
    const fetchHeatIndexHistory = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/heat-index/history', {
          params: { 
            period: viewMode,
            limit: viewMode === 'daily' ? 24 : (viewMode === 'weekly' ? 7 : 30),
          },
        });

        if (response.data.success && response.data.data) {
          const historyData = response.data.data as HeatIndexData[];
          const formattedHistory = historyData.map((point) => ({
            ...point,
            displayTime: formatDateTimeCompact(point.time),
            fullTime: formatDateTimeGlobal(point.time),
          }));

          setData(formattedHistory);

          // Calculate current stats
          if (formattedHistory.length > 0) {
            const latest = formattedHistory[formattedHistory.length - 1];
            const allHeatIndexes = formattedHistory.map(d => d.avgHeatIndex);
            
            // Defensive checks for empty arrays
            const validIndexes = allHeatIndexes.filter(h => typeof h === 'number' && !isNaN(h));
            
            setCurrentStats({
              heatIndex: Math.round(latest.avgHeatIndex * 10) / 10,
              max: validIndexes.length > 0 ? Math.round(Math.max(...validIndexes) * 10) / 10 : 0,
              min: validIndexes.length > 0 ? Math.round(Math.min(...validIndexes) * 10) / 10 : 0,
              avg: validIndexes.length > 0 
                ? Math.round((validIndexes.reduce((a, b) => a + b, 0) / validIndexes.length) * 10) / 10
                : 0,
            });
          } else {
            // Reset stats if no data
            setCurrentStats({ heatIndex: 0, max: 0, min: 0, avg: 0 });
          }

          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch heat index history:', err);
        setError('Failed to load heat index data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatIndexHistory();
  }, [viewMode]);

  const currentLevel = getHeatLevel(currentStats.heatIndex);
  const xKey = 'displayTime';
  const getFullTimestamp = (label: string): string => {
    return data.find((point) => point.displayTime === label)?.fullTime ?? label;
  };

  return (
    <div className="heat-index-page">
      <div className="page-header">
        <h1>Heat Index Monitor</h1>
        <p>Real-time and historical heat index data</p>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <div className="heat-index-stats">
        <Card className="stat-card stat-card-heat" data-heat-level={currentLevel}>
          <div className="stat-content">
            <div className="stat-icon" data-heat-level={currentLevel}>
              🌡️
            </div>
            <div className="stat-info">
              <div className="stat-value" data-heat-level={currentLevel}>
                {currentStats.heatIndex}°C
              </div>
              <div className="stat-label">Current Heat Index</div>
              <div className="stat-badge" data-heat-level={currentLevel}>
                {getHeatLabel(currentLevel)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon">🔺</div>
            <div className="stat-info">
              <div className="stat-value">{currentStats.max}°C</div>
              <div className="stat-label">{viewMode === 'daily' ? "Today's" : "Period's"} Maximum</div>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon">🔻</div>
            <div className="stat-info">
              <div className="stat-value">{currentStats.min}°C</div>
              <div className="stat-label">{viewMode === 'daily' ? "Today's" : "Period's"} Minimum</div>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">{currentStats.avg}°C</div>
              <div className="stat-label">{viewMode === 'daily' ? "Today's" : "Period's"} Average</div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Heat Index Trends"
        actions={
          <div className="view-mode-buttons">
            <Button
              size="small"
              variant={viewMode === 'daily' ? 'primary' : 'outline'}
              onClick={() => setViewMode('daily')}
            >
              Daily
            </Button>
            <Button
              size="small"
              variant={viewMode === 'weekly' ? 'primary' : 'outline'}
              onClick={() => setViewMode('weekly')}
            >
              Weekly
            </Button>
            <Button
              size="small"
              variant={viewMode === 'monthly' ? 'primary' : 'outline'}
              onClick={() => setViewMode('monthly')}
            >
              Monthly
            </Button>
          </div>
        }
      >
        {loading && <div className="loading-state">Loading data...</div>}
        {!loading && data.length > 0 && (
          <Chart
            data={data}
            type="area"
            dataKeys={[
              {
                key: 'avgHeatIndex',
                name: 'Heat Index (°C)',
                color: CHART_COLORS.heatIndex,
              },
            ]}
            xAxisKey={xKey}
            xAxisAngle={-12}
            xAxisHeight={72}
            tooltipLabelFormatter={getFullTimestamp}
            height={350}
          />
        )}
        {!loading && data.length === 0 && (
          <div className="empty-state">No data available for this period</div>
        )}
      </Card>

      <div className="heat-index-charts">
        <Card title="Temperature & Humidity">
          {loading && <div className="loading-state">Loading...</div>}
          {!loading && data.length > 0 && (
            <Chart
              data={data}
              type="line"
              dataKeys={[
                {
                  key: 'avgTemp',
                  name: 'Temperature (°C)',
                  color: CHART_COLORS.temperature,
                },
                {
                  key: 'avgHumidity',
                  name: 'Humidity (%)',
                  color: CHART_COLORS.humidity,
                },
              ]}
              xAxisKey={xKey}
              xAxisAngle={-12}
              xAxisHeight={72}
              tooltipLabelFormatter={getFullTimestamp}
              height={300}
            />
          )}
        </Card>

        <Card title="Heat Index Comparison">
          {loading && <div className="loading-state">Loading...</div>}
          {!loading && data.length > 0 && (
            <Chart
              data={data}
              type="bar"
              dataKeys={[
                {
                  key: 'avgHeatIndex',
                  name: 'Heat Index (°C)',
                  color: CHART_COLORS.heatIndex,
                },
              ]}
              xAxisKey={xKey}
              xAxisAngle={-12}
              xAxisHeight={72}
              tooltipLabelFormatter={getFullTimestamp}
              height={300}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
