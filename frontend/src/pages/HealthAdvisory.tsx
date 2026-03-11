import React, { useState } from 'react';
import { Card } from '../components/Card';
import { AdvisoryAlert } from '../components/AdvisoryAlert';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import type { HealthAdvisory as HealthAdvisoryType } from '../types';
import { DEPED_RECOMMENDATIONS } from '../utils/constants';
import '../styles/HealthAdvisory.css';

export const HealthAdvisory: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Mock advisories
  const [advisories] = useState<HealthAdvisoryType[]>([
    {
      id: '1',
      schoolId: 'school-1',
      heatLevel: 'extreme-caution',
      title: 'Extreme Caution Heat Alert',
      advisoryText:
        'The heat index has reached 42°C. All outdoor activities must be minimized. Ensure students stay hydrated and monitor for heat-related symptoms.',
      recommendations: DEPED_RECOMMENDATIONS['extreme-caution'],
      riskLevel: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '2',
      schoolId: 'school-1',
      heatLevel: 'caution',
      title: 'Moderate Heat Advisory',
      advisoryText:
        'Heat index is currently at 35°C. Take precautionary measures and limit strenuous outdoor activities.',
      recommendations: DEPED_RECOMMENDATIONS.caution,
      riskLevel: 'medium',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '3',
      schoolId: 'school-1',
      heatLevel: 'normal',
      title: 'Normal Weather Conditions',
      advisoryText:
        'Current heat levels are within normal range. Continue regular activities with standard precautions.',
      recommendations: DEPED_RECOMMENDATIONS.normal,
      riskLevel: 'low',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ]);

  const activeAdvisories = advisories.filter(
    (a) => a.heatLevel !== 'normal' && a.riskLevel !== 'low'
  );
  const historyAdvisories = advisories.filter(
    (a) => a.heatLevel === 'normal' || a.riskLevel === 'low'
  );

  return (
    <div className="health-advisory-page">
      <div className="page-header">
        <h1>Health Advisories</h1>
        <p>Current and past health advisories for heat safety</p>
        {isAdmin && (
          <Button variant="primary">Create Manual Advisory</Button>
        )}
      </div>

      {activeAdvisories.length > 0 && (
        <div className="advisory-section">
          <h2>Active Advisories</h2>
          <div className="advisory-list">
            {activeAdvisories.map((advisory) => (
              <AdvisoryAlert key={advisory.id} advisory={advisory} />
            ))}
          </div>
        </div>
      )}

      <div className="advisory-section">
        <h2>Recent Advisories</h2>
        <div className="advisory-list">
          {historyAdvisories.map((advisory) => (
            <AdvisoryAlert key={advisory.id} advisory={advisory} />
          ))}
        </div>
      </div>

      <Card title="DepEd Heat Index Guidelines">
        <div className="guidelines">
          <div className="guideline-item">
            <div className="guideline-level guideline-normal">
              <strong>Normal (27°C - 32°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.normal.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-caution">
              <strong>Caution (32°C - 41°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.caution.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-extreme-caution">
              <strong>Extreme Caution (41°C - 54°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS['extreme-caution'].map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="guideline-item">
            <div className="guideline-level guideline-danger">
              <strong>Danger (&gt; 54°C)</strong>
            </div>
            <ul>
              {DEPED_RECOMMENDATIONS.danger.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
