import React from 'react';
import type { HeatLevel } from '../types';
import { getHeatLabel } from '../utils/helpers';
import { formatTemperature, formatDateTimeGlobal } from '../utils/formatters';
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
  const label = getHeatLabel(level);

  return (
    <div 
      className="heat-index-card" 
      data-heat-level={level}
    >
      <div className="heat-index-header">
        <h3 className="heat-index-title">Current Heat Index</h3>
        <span className="heat-index-badge" data-heat-level={level}>
          {label}
        </span>
      </div>

      <div className="heat-index-body">
        <div className="heat-index-main">
          <div className="heat-index-value" data-heat-level={level}>
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
        </div>
      </div>

      <div className="heat-index-footer">
        <small>Last updated: {formatDateTimeGlobal(lastUpdated)}</small>
      </div>
    </div>
  );
};
