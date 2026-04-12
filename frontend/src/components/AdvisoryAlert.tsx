import React from 'react';
import type { HealthAdvisory } from '../types';
import { MdWarning, MdInfo, MdError } from 'react-icons/md';
import { formatDateTimeGlobal } from '../utils/formatters';
import '../styles/AdvisoryAlert.css';

interface AdvisoryAlertProps {
  advisory: HealthAdvisory;
  onDismiss?: () => void;
}

export const AdvisoryAlert: React.FC<AdvisoryAlertProps> = ({
  advisory,
  onDismiss,
}) => {
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

  return (
    <div
      className={`advisory-alert advisory-alert-${advisory.riskLevel}`}
      data-heat-level={advisory.heatLevel}
    >
      <div className="advisory-alert-header">
        <div className="advisory-alert-icon" data-heat-level={advisory.heatLevel}>
          {getRiskIcon()}
        </div>
        <div className="advisory-alert-title">
          <h4>{advisory.title}</h4>
          <span className="advisory-alert-risk">{advisory.riskLevel} risk</span>
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
