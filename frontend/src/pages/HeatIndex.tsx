import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Chart } from '../components/Chart';
import { Button } from '../components/Button';
import { getHeatLevel, getHeatLabel } from '../utils/helpers';
import { CHART_COLORS } from '../utils/constants';
import '../styles/heatIndex.css';

export const HeatIndex: React.FC = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Mock data for different time periods
  const dailyData = [
    { time: '6:00 AM', temperature: 26, humidity: 75, heatIndex: 27 },
    { time: '8:00 AM', temperature: 28, humidity: 72, heatIndex: 30 },
    { time: '10:00 AM', temperature: 31, humidity: 68, heatIndex: 34 },
    { time: '12:00 PM', temperature: 34, humidity: 70, heatIndex: 40 },
    { time: '2:00 PM', temperature: 35, humidity: 75, heatIndex: 44 },
    { time: '4:00 PM', temperature: 33, humidity: 72, heatIndex: 38 },
    { time: '6:00 PM', temperature: 30, humidity: 70, heatIndex: 33 },
  ];

  const weeklyData = [
    { day: 'Mon', avgTemp: 32, avgHumidity: 70, avgHeatIndex: 36 },
    { day: 'Tue', avgTemp: 33, avgHumidity: 72, avgHeatIndex: 38 },
    { day: 'Wed', avgTemp: 34, avgHumidity: 75, avgHeatIndex: 41 },
    { day: 'Thu', avgTemp: 35, avgHumidity: 73, avgHeatIndex: 42 },
    { day: 'Fri', avgTemp: 33, avgHumidity: 71, avgHeatIndex: 38 },
    { day: 'Sat', avgTemp: 32, avgHumidity: 69, avgHeatIndex: 35 },
    { day: 'Sun', avgTemp: 31, avgHumidity: 68, avgHeatIndex: 34 },
  ];

  const monthlyData = [
    { week: 'Week 1', avgTemp: 31, avgHumidity: 68, avgHeatIndex: 34 },
    { week: 'Week 2', avgTemp: 33, avgHumidity: 71, avgHeatIndex: 38 },
    { week: 'Week 3', avgTemp: 34, avgHumidity: 74, avgHeatIndex: 41 },
    { week: 'Week 4', avgTemp: 32, avgHumidity: 70, avgHeatIndex: 36 },
  ];

  const getChartData = () => {
    switch (viewMode) {
      case 'weekly':
        return { data: weeklyData, xKey: 'day' };
      case 'monthly':
        return { data: monthlyData, xKey: 'week' };
      default:
        return { data: dailyData, xKey: 'time' };
    }
  };

  const { data, xKey } = getChartData();

  // Heat index statistics
  const currentHeatIndex = 38.5;
  const currentLevel = getHeatLevel(currentHeatIndex);
  const todayMax = 44;
  const todayMin = 27;
  const todayAvg = 35.5;

  return (
    <div className="heat-index-page">
      <div className="page-header">
        <h1>Heat Index Monitor</h1>
        <p>Real-time and historical heat index data</p>
      </div>

      <div className="heat-index-stats">
        <Card className="stat-card stat-card-heat" data-heat-level={currentLevel}>
          <div className="stat-content">
            <div className="stat-icon" data-heat-level={currentLevel}>
              🌡️
            </div>
            <div className="stat-info">
              <div className="stat-value" data-heat-level={currentLevel}>
                {currentHeatIndex}°C
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
              <div className="stat-value">{todayMax}°C</div>
              <div className="stat-label">Today's Maximum</div>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon">🔻</div>
            <div className="stat-info">
              <div className="stat-value">{todayMin}°C</div>
              <div className="stat-label">Today's Minimum</div>
            </div>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">{todayAvg}°C</div>
              <div className="stat-label">Today's Average</div>
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
        <Chart
          data={data}
          type="area"
          dataKeys={[
            {
              key: viewMode === 'daily' ? 'heatIndex' : 'avgHeatIndex',
              name: 'Heat Index (°C)',
              color: CHART_COLORS.heatIndex,
            },
          ]}
          xAxisKey={xKey}
          height={350}
        />
      </Card>

      <div className="heat-index-charts">
        <Card title="Temperature & Humidity">
          <Chart
            data={data}
            type="line"
            dataKeys={[
              {
                key: viewMode === 'daily' ? 'temperature' : 'avgTemp',
                name: 'Temperature (°C)',
                color: CHART_COLORS.temperature,
              },
              {
                key: viewMode === 'daily' ? 'humidity' : 'avgHumidity',
                name: 'Humidity (%)',
                color: CHART_COLORS.humidity,
              },
            ]}
            xAxisKey={xKey}
            height={300}
          />
        </Card>

        <Card title="Heat Index Comparison">
          <Chart
            data={data}
            type="bar"
            dataKeys={[
              {
                key: viewMode === 'daily' ? 'heatIndex' : 'avgHeatIndex',
                name: 'Heat Index (°C)',
                color: CHART_COLORS.heatIndex,
              },
            ]}
            xAxisKey={xKey}
            height={300}
          />
        </Card>
      </div>
    </div>
  );
};
