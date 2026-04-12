import React from 'react';
import type { WeatherData } from '../types';
import { formatTemperature, formatHumidity, formatWindSpeed, formatDateTimeGlobal } from '../utils/formatters';
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
          <div className="weather-temp">
            {formatTemperature(weather.temperature)}
          </div>
          <div className="weather-conditions">{weather.conditions}</div>
        </div>

        <div className="weather-details">
          <div className="weather-detail">
            <span className="weather-detail-label">Feels Like</span>
            <span className="weather-detail-value">
              {formatTemperature(weather.feelsLike)}
            </span>
          </div>

          <div className="weather-detail">
            <span className="weather-detail-label">Humidity</span>
            <span className="weather-detail-value">
              {formatHumidity(weather.humidity)}
            </span>
          </div>

          <div className="weather-detail">
            <span className="weather-detail-label">Wind Speed</span>
            <span className="weather-detail-value">
              {formatWindSpeed(weather.windSpeed)}
            </span>
          </div>

          <div className="weather-detail">
            <span className="weather-detail-label">Pressure</span>
            <span className="weather-detail-value">
              {weather.pressure} hPa
            </span>
          </div>
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
