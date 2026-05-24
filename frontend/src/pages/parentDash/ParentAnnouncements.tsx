import React, { useEffect, useMemo, useState } from 'react';
import { ParentSectionPage } from './ParentSectionPage';
import type { HealthAdvisory as HealthAdvisoryType } from '../../types';
import { DEPED_RECOMMENDATIONS } from '../../utils/constants';
import { apiClient } from '../../services/api';
import { fetchAnnouncements, type Announcement } from '../../services/announcements.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import '../../styles/HealthAdvisory.css';
import '../../styles/ParentAnnouncements.css';

export const ParentAnnouncements: React.FC = () => {
  const [advisories, setAdvisories] = useState<HealthAdvisoryType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  const formatHeatLevelLabel = (value: string): string =>
    value
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const formatDateTime = (value?: string): string => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    return parsed.toLocaleString();
  };

  useEffect(() => {
    const fetchAdvisories = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/health-advisories', {
          params: { limit: 20, offset: 0 },
        });

        if (response.data.success && response.data.data) {
          const convertedAdvisories: HealthAdvisoryType[] = response.data.data.map((log: any) => {
            const heatLevel = String(log.safety_level || 'normal').toLowerCase();
            const safeHeatLevel = ['normal', 'caution', 'extreme-caution', 'danger', 'extreme-danger'].includes(heatLevel)
              ? heatLevel
              : 'normal';

            return {
              id: log.id,
              schoolId: 'school-1',
              heatLevel: safeHeatLevel as any,
              title: `Advisory - ${safeHeatLevel.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
              advisoryText: log.response || 'No advisory text available',
              recommendations: DEPED_RECOMMENDATIONS[safeHeatLevel as keyof typeof DEPED_RECOMMENDATIONS] || DEPED_RECOMMENDATIONS.normal,
              riskLevel: safeHeatLevel === 'normal' ? 'low' : safeHeatLevel === 'caution' ? 'medium' : 'high',
              createdAt: log.created_at,
              confidenceScore: typeof log.confidence_score === 'number' ? log.confidence_score : undefined,
              decisionBasis: log.decision_basis || undefined,
              modelMode: log.model_profile?.mode || undefined,
              modelScope: log.model_profile?.scope || undefined,
            };
          });

          setAdvisories(convertedAdvisories);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch advisories:', err);
        setError('Failed to load AI advisory history');
        setAdvisories([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchAdvisories();
  }, []);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const data = await fetchAnnouncements(10, 0);
        setAnnouncements(data);
        setAnnouncementsError(null);
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
        setAnnouncements([]);
        setAnnouncementsError('Failed to load principal announcements');
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    void loadAnnouncements();
  }, []);

  const activeAdvisories = useMemo(
    () => advisories.filter((advisory) => advisory.heatLevel !== 'normal' && advisory.riskLevel !== 'low'),
    [advisories]
  );

  const historyAdvisories = useMemo(
    () => advisories.filter((advisory) => advisory.heatLevel === 'normal' || advisory.riskLevel === 'low'),
    [advisories]
  );

  return (
    <ParentSectionPage
      eyebrow="School Updates"
      title="Announcements"
      topId="announcements-top"
      description="A parent-facing notice board for heat advisories, school schedule changes, and operational reminders."
      summary="This page keeps principal announcements and AI advisories short, actionable, and directly tied to school heat-safety operations."
      highlights={[
        { label: 'Latest notice', value: 'Heat monitoring active' },
        { label: 'Tone', value: 'Clear and actionable' },
        { label: 'Coverage', value: 'Principal notices and AI advisories' },
      ]}
      sections={[
        {
          title: 'Current principal announcements',
          body: 'These are the school announcements parents should read first for schedule updates, reminders, and urgent notices.',
          bullets: [
            'Start time or dismissal updates',
            'Activity suspensions or indoor-only reminders',
            'Hydration and clothing guidance during high heat',
          ],
        },
        {
          title: 'Recommended alert priority',
          body: 'Put the highest priority on anything that affects child safety or pickup plans.',
          bullets: [
            'Danger-level heat advisories',
            'Emergency class schedule changes',
            'Parent pickup reminders and clinic follow-up notes',
          ],
          tone: 'alert',
        },
        {
          title: 'How the advisory works',
          body: 'The advisory reads the current school weather context and converts it into practical guidance for families.',
          bullets: [
            'Normal, caution, extreme caution, danger, and extreme danger levels',
            'Parent actions for hydration, rest, and activity limits',
            'Safety reminders when the school must adjust operations',
          ],
        },
        {
          title: 'What it will not do',
          body: 'The advisory does not make diagnosis claims or replace emergency care.',
          bullets: [
            'It will not replace a doctor or clinic.',
            'It will not answer unrelated questions outside the system scope.',
            'It will not promise school decisions without data support.',
          ],
          tone: 'alert',
        },
        {
          title: 'Best parent follow-up',
          body: 'Use the chatbot page to ask follow-up questions about a specific advisory result.',
          bullets: [
            'Ask what the advisory means for your child today.',
            'Confirm if PE, recess, or pickup timing changed.',
            'Review what signs should trigger urgent action at home.',
          ],
          tone: 'success',
        },
      ]}
      footerNote="Need a conversational explanation? Open Chatbot and ask the same question in plain language."
    >
      <div className="parent-announcements-page">
        <div className="advisory-section parent-announcements-section">
          <h2 id="principal-announcements">Principal Announcements</h2>
          {announcementsError && <div className="error-alert">{announcementsError}</div>}
          {announcementsLoading && <div className="loading-state">Loading principal announcements...</div>}
          {!announcementsLoading && announcements.length === 0 && !announcementsError && (
            <p className="empty-state-text">No principal announcements</p>
          )}
          {!announcementsLoading && announcements.length > 0 && (
            <div className="advisory-table-wrap table-wrap">
              <table className="advisory-table app-table">
                <thead>
                  <tr>
                    <th scope="col">Issued</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Title</th>
                    <th scope="col">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((announcement) => (
                    <tr key={announcement.id}>
                      <td>{formatDateTimeGlobal(announcement.created_at ?? new Date().toISOString())}</td>
                      <td>
                        <span className={`advisory-level badge-${announcement.priority ?? 'info'}`}>
                          {(announcement.priority ?? 'info').toUpperCase()}
                        </span>
                      </td>
                      <td>{announcement.title}</td>
                      <td>{announcement.body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            Loading AI advisory history...
          </div>
        )}

        {!loading && activeAdvisories.length > 0 && (
          <div className="advisory-section parent-announcements-section">
            <h2 id="active-advisories">Active AI Advisories</h2>
            <div className="advisory-table-wrap">
              <table className="advisory-table app-table">
                <thead>
                  <tr>
                    <th scope="col">Issued</th>
                    <th scope="col">Heat Level</th>
                    <th scope="col">Risk</th>
                    <th scope="col">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdvisories.map((advisory) => (
                    <tr key={advisory.id}>
                      <td>{formatDateTime(advisory.createdAt)}</td>
                      <td>
                        <span className={`advisory-level badge-${advisory.heatLevel}`}>
                          {formatHeatLevelLabel(advisory.heatLevel)}
                        </span>
                      </td>
                      <td className={`advisory-risk risk-${advisory.riskLevel}`}>
                        {formatHeatLevelLabel(advisory.riskLevel)}
                      </td>
                      <td>{advisory.advisoryText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="advisory-section parent-announcements-section">
          <h2 id="announcement-history">AI Advisory History {!loading && `(${historyAdvisories.length})`}</h2>
          <div className="advisory-table-wrap table-wrap">
            <table className="advisory-table app-table">
              <thead>
                <tr>
                  <th scope="col">Issued</th>
                  <th scope="col">Heat Level</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Summary</th>
                </tr>
              </thead>
              <tbody>
                {historyAdvisories.map((advisory) => (
                  <tr key={advisory.id}>
                    <td>{formatDateTime(advisory.createdAt)}</td>
                    <td>
                      <span className={`advisory-level badge-${advisory.heatLevel}`}>
                        {formatHeatLevelLabel(advisory.heatLevel)}
                      </span>
                    </td>
                    <td className={`advisory-risk risk-${advisory.riskLevel}`}>
                      {formatHeatLevelLabel(advisory.riskLevel)}
                    </td>
                    <td>{advisory.advisoryText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && historyAdvisories.length === 0 && (
              <p className="empty-state-text">No recent advisories</p>
            )}
          </div>
        </div>
      </div>
    </ParentSectionPage>
  );
};