import React from 'react';
import type { WeatherData } from '../types';
import { formatTemperature, formatDateTimeGlobal } from '../utils/formatters';
import { WEATHER_ICONS } from '../utils/constants';
import '../styles/WeatherWidget.css';

interface WeatherWidgetProps {
  weather: WeatherData;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather }) => {
  const icon = WEATHER_ICONS[weather.icon] || '☀️';

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3 className="weather-title">Current Weather</h3>
      </div>

      <div className="weather-body">
        <div className="weather-main">
          <div className="weather-icon">{icon}</div>
          <div className="weather-temp big-metric">
            {formatTemperature(weather.temperature)}
          </div>
          <div className="weather-conditions">{weather.conditions}</div>
        </div>

      </div>

      <div className="weather-footer">
        <small>
          Updated: {formatDateTimeGlobal(weather.timestamp)}
        </small>
      </div>
    </div>
  );
};
