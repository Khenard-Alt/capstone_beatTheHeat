import React, { useEffect, useMemo, useState } from 'react';
import { ParentSectionPage } from './ParentSectionPage';
import type { HealthAdvisory as HealthAdvisoryType } from '../../types';
import { DEPED_RECOMMENDATIONS } from '../../utils/constants';
import { apiClient } from '../../services/api';
import { fetchAnnouncementsPage, type Announcement } from '../../services/announcements.service';
import { formatDateTimeGlobal } from '../../utils/formatters';
import { Pagination } from '../../components/Pagination';
import '../../styles/HealthAdvisory.css';
import '../../styles/ParentAnnouncements.css';
import '../../styles/Notifications.css';

const ANNOUNCEMENTS_PAGE_SIZE = 10;
const ADVISORIES_PAGE_SIZE = 10;

const announcementPriorityClass = (priority?: string): string => {
  const normalized = String(priority ?? 'info').toLowerCase();
  if (normalized === 'critical' || normalized === 'high') return 'notification-priority-high';
  if (normalized === 'medium') return 'notification-priority-medium';
  return 'notification-priority-low';
};

const announcementIcon = (priority?: string): string => {
  const normalized = String(priority ?? 'info').toLowerCase();
  return normalized === 'critical' || normalized === 'high' ? '🚨' : '📣';
};

export const ParentAnnouncements: React.FC = () => {
  const [advisories, setAdvisories] = useState<HealthAdvisoryType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsTotal, setAnnouncementsTotal] = useState(0);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [activeAdvisoriesPage, setActiveAdvisoriesPage] = useState(1);
  const [historyAdvisoriesPage, setHistoryAdvisoriesPage] = useState(1);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
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
        const { data, total } = await fetchAnnouncementsPage(ANNOUNCEMENTS_PAGE_SIZE, (announcementsPage - 1) * ANNOUNCEMENTS_PAGE_SIZE);
        setAnnouncements(data);
        setAnnouncementsTotal(total);
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
  }, [announcementsPage]);

  const announcementsTotalPages = Math.max(1, Math.ceil(announcementsTotal / ANNOUNCEMENTS_PAGE_SIZE));

  const activeAdvisories = useMemo(
    () => advisories.filter((advisory) => advisory.heatLevel !== 'normal' && advisory.riskLevel !== 'low'),
    [advisories]
  );

  const historyAdvisories = useMemo(
    () => advisories.filter((advisory) => advisory.heatLevel === 'normal' || advisory.riskLevel === 'low'),
    [advisories]
  );

  const activeAdvisoriesTotalPages = Math.max(1, Math.ceil(activeAdvisories.length / ADVISORIES_PAGE_SIZE));
  const pagedActiveAdvisories = activeAdvisories.slice(
    (activeAdvisoriesPage - 1) * ADVISORIES_PAGE_SIZE,
    activeAdvisoriesPage * ADVISORIES_PAGE_SIZE
  );

  const historyAdvisoriesTotalPages = Math.max(1, Math.ceil(historyAdvisories.length / ADVISORIES_PAGE_SIZE));
  const pagedHistoryAdvisories = historyAdvisories.slice(
    (historyAdvisoriesPage - 1) * ADVISORIES_PAGE_SIZE,
    historyAdvisoriesPage * ADVISORIES_PAGE_SIZE
  );

  useEffect(() => {
    if (activeAdvisoriesPage > activeAdvisoriesTotalPages) {
      setActiveAdvisoriesPage(activeAdvisoriesTotalPages);
    }
  }, [activeAdvisoriesPage, activeAdvisoriesTotalPages]);

  useEffect(() => {
    if (historyAdvisoriesPage > historyAdvisoriesTotalPages) {
      setHistoryAdvisoriesPage(historyAdvisoriesTotalPages);
    }
  }, [historyAdvisoriesPage, historyAdvisoriesTotalPages]);

  return (
    <ParentSectionPage
      eyebrow="School Updates"
      title="Announcements"
      topId="announcements-top"
      description="A parent-facing notice board for heat advisories, school schedule changes, and operational reminders."
      summary="This page keeps principal announcements and AI advisories short, actionable, and directly tied to school heat-safety operations."
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
      footerAction={{ label: 'Open Chatbot', to: '/parent/chatbot' }}
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
            <div className="notifications-list">
              {announcements.map((announcement) => {
                const isExpanded = expandedAnnouncementId === announcement.id;
                const isLong = announcement.body.length > 140;
                const bodyPreview = isExpanded || !isLong ? announcement.body : `${announcement.body.slice(0, 140)}...`;

                return (
                  <div key={announcement.id} className={`notification-item ${announcementPriorityClass(announcement.priority)}`}>
                    <div className="notification-icon">{announcementIcon(announcement.priority)}</div>
                    <div className="notification-body">
                      <div className="notification-header">
                        <strong>{announcement.title}</strong>
                        <small className="notification-time">
                          {formatDateTimeGlobal(announcement.created_at ?? new Date().toISOString())}
                        </small>
                      </div>
                      <div className="notification-message">{bodyPreview}</div>
                    </div>
                    {isLong && (
                      <div className="notification-actions">
                        <button
                          type="button"
                          className="action-view-small"
                          onClick={() => setExpandedAnnouncementId(isExpanded ? null : announcement.id)}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <Pagination
                page={announcementsPage}
                totalPages={announcementsTotalPages}
                totalItems={announcementsTotal}
                pageSize={ANNOUNCEMENTS_PAGE_SIZE}
                onPageChange={setAnnouncementsPage}
              />
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
                  {pagedActiveAdvisories.map((advisory) => (
                    <tr key={advisory.id}>
                      <td data-label="Issued">{formatDateTime(advisory.createdAt)}</td>
                      <td data-label="Heat Level">
                        <span className={`advisory-level badge-${advisory.heatLevel}`}>
                          {formatHeatLevelLabel(advisory.heatLevel)}
                        </span>
                      </td>
                      <td data-label="Risk" className={`advisory-risk risk-${advisory.riskLevel}`}>
                        {formatHeatLevelLabel(advisory.riskLevel)}
                      </td>
                      <td data-label="Summary">{advisory.advisoryText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={activeAdvisoriesPage}
              totalPages={activeAdvisoriesTotalPages}
              totalItems={activeAdvisories.length}
              pageSize={ADVISORIES_PAGE_SIZE}
              onPageChange={setActiveAdvisoriesPage}
            />
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
                {pagedHistoryAdvisories.map((advisory) => (
                  <tr key={advisory.id}>
                    <td data-label="Issued">{formatDateTime(advisory.createdAt)}</td>
                    <td data-label="Heat Level">
                      <span className={`advisory-level badge-${advisory.heatLevel}`}>
                        {formatHeatLevelLabel(advisory.heatLevel)}
                      </span>
                    </td>
                    <td data-label="Risk" className={`advisory-risk risk-${advisory.riskLevel}`}>
                      {formatHeatLevelLabel(advisory.riskLevel)}
                    </td>
                    <td data-label="Summary">{advisory.advisoryText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && historyAdvisories.length === 0 && (
              <p className="empty-state-text">No recent advisories</p>
            )}
          </div>
          <Pagination
            page={historyAdvisoriesPage}
            totalPages={historyAdvisoriesTotalPages}
            totalItems={historyAdvisories.length}
            pageSize={ADVISORIES_PAGE_SIZE}
            onPageChange={setHistoryAdvisoriesPage}
          />
        </div>
      </div>
    </ParentSectionPage>
  );
};