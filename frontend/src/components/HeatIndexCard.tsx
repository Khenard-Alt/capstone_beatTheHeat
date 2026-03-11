import React from 'react';
import { HeatLevel } from '../types';
import { getHeatColor, getHeatLabel } from '../utils/helpers';
import { formatTemperature, formatHumidity } from '../utils/formatters';
import '../styles/HeatIndexCard.css';

interface HeatIndexCardProps {
  heatIndex: number;
  temperature: number;
  humidity: number;
  level: HeatLevel;
  lastUpdated: string;
}

export const HeatIndexCard: React.FC<HeatIndexCardProps> = ({
  heatIndex,
  temperature,
  humidity,
  level,
  lastUpdated,
}) => {
  const color = getHeatColor(level);
  const label = getHeatLabel(level);

  return (
    <div className="heat-index-card" style={{ borderColor: color }}>
      <div className="heat-index-header">
        <h3 className="heat-index-title">Current Heat Index</h3>
        <span
          className="heat-index-badge"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      </div>

      <div className="heat-index-body">
        <div className="heat-index-main">
          <div className="heat-index-value" style={{ color }}>
            {heatIndex.toFixed(1)}°C
          </div>
          <div className="heat-index-label">Heat Index</div>
        </div>

        <div className="heat-index-metrics">
          <div className="metric">
            <span className="metric-icon">🌡️</span>
            <div className="metric-content">
              <div className="metric-value">{formatTemperature(temperature)}</div>
              <div className="metric-label">Temperature</div>
            </div>
          </div>

          <div className="metric">
            <span className="metric-icon">💧</span>
            <div className="metric-content">
              <div className="metric-value">{formatHumidity(humidity)}</div>
              <div className="metric-label">Humidity</div>
            </div>
          </div>
        </div>
      </div>

      <div className="heat-index-footer">
        <small>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</small>
      </div>
    </div>
  );
};
