import React from 'react';
import type { HealthAdvisory } from '../types';
import { MdWarning, MdInfo, MdError } from 'react-icons/md';
import { formatDateTimeGlobal } from '../utils/formatters';
import { HEAT_COLORS } from '../utils/constants';
import '../styles/AdvisoryAlert.css';

interface AdvisoryAlertProps {
  advisory: HealthAdvisory;
  onDismiss?: () => void;
}

export const AdvisoryAlert: React.FC<AdvisoryAlertProps> = ({
  advisory,
  onDismiss,
}) => {
  const getHeatColor = (heatLevel: HealthAdvisory['heatLevel']): string => {
    return HEAT_COLORS[heatLevel] ?? HEAT_COLORS.normal;
  };

  const hexToRgb = (hex: string): string => {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return '37, 99, 235';
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    if ([red, green, blue].some((value) => Number.isNaN(value))) {
      return '37, 99, 235';
    }

    return `${red}, ${green}, ${blue}`;
  };

  const accentColor = getHeatColor(advisory.heatLevel);
  const accentRgb = hexToRgb(accentColor);

  const getRiskIcon = () => {
    switch (advisory.riskLevel) {
      case 'critical':
        return <MdError />;
      case 'high':
        return <MdWarning />;
      default:
        return <MdInfo />;
    }
  };

  const heatLabel = advisory.heatLevel
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const riskLabel = {
    low: 'Low risk',
    medium: 'Moderate risk',
    high: 'High risk',
    critical: 'Critical risk',
  }[advisory.riskLevel];

  return (
    <div
      className={`advisory-alert advisory-alert-${advisory.riskLevel}`}
      data-heat-level={advisory.heatLevel}
      style={{
        '--advisory-accent': accentColor,
        '--advisory-accent-rgb': accentRgb,
      } as React.CSSProperties}
    >
      <div className="advisory-alert-header">
        <div className="advisory-alert-icon" data-heat-level={advisory.heatLevel}>
          {getRiskIcon()}
        </div>
        <div className="advisory-alert-title">
          <h4>{advisory.title}</h4>
          <div className="advisory-alert-meta">
            <span className="advisory-alert-risk">{riskLabel}</span>
            <span className="advisory-alert-heat">{heatLabel}</span>
          </div>
        </div>
        {onDismiss && (
          <button className="advisory-alert-dismiss" onClick={onDismiss}>
            &times;
          </button>
        )}
      </div>

      <div className="advisory-alert-body">
        <p className="advisory-alert-text">{advisory.advisoryText}</p>

        {advisory.recommendations.length > 0 && (
          <div className="advisory-alert-recommendations">
            <strong>Recommendations:</strong>
            <ul>
              {advisory.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="advisory-alert-footer">
        <small>
          Issued: {formatDateTimeGlobal(advisory.createdAt)}
        </small>
      </div>
    </div>
  );
};
