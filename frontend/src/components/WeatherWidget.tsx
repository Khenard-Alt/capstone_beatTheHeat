import React from 'react';
import type { WeatherData } from '../types';
import { formatTemperature, formatDateTimeGlobal } from '../utils/formatters';
import sunnyIcon from '../assets/dashboard/Wsunny.svg';
import cloudyIcon from '../assets/dashboard/Wcloudy.svg';
import rainyIcon from '../assets/dashboard/Wrainy.svg';
import '../styles/WeatherWidget.css';

interface WeatherWidgetProps {
  weather: WeatherData;
}

// weather.icon holds a simple sky-state key ('sunny' | 'cloudy' | 'rainy')
// derived from the condition text, since the backend doesn't send OWM icon codes.
const WEATHER_ICON_ASSETS: Record<string, string> = {
  sunny: sunnyIcon,
  cloudy: cloudyIcon,
  rainy: rainyIcon,
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather }) => {
  const icon = WEATHER_ICON_ASSETS[weather.icon] || sunnyIcon;

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3 className="weather-title">Current Weather</h3>
      </div>

      <div className="weather-body">
        <div className="weather-main">
          <img className="weather-icon" src={icon} alt={weather.conditions} />
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
