import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeatIndexCard } from '../../components/HeatIndexCard';
import { WeatherWidget } from '../../components/WeatherWidget';
import { AdvisoryAlert } from '../../components/AdvisoryAlert';
import { Chart } from '../../components/Chart';
import { Card } from '../../components/Card';
import { PredictiveHeatReport } from '../../components/PredictiveHeatReport';
import { apiClient } from '../../services/api';
import { fetchAnnouncements } from '../../services/announcements.service'; import type { Announcement } from '../../services/announcements.service';
import { fetchIncidents } from '../../services/incidents.service';
import { fetchCurrentWeather } from '../../services/weather.service';
import { fetchRealtimeAdvisory } from '../../services/healthAdvisory.service';
import type { HeatIndexData, WeatherData, HealthAdvisory, StudentHealthIncident } from '../../types';
import { getHeatLevel } from '../../utils/helpers';
import { formatDateTimeCompact, formatDateTimeGlobal } from '../../utils/formatters';
import { CHART_COLORS, DEPED_RECOMMENDATIONS } from '../../utils/constants';
import { mapRealtimeAdvisory } from '../../utils/advisory';
import type { IncidentRecord } from '../../services/incidents.service';
import {
  MdClose,
  MdSearch,
  MdThermostat,
  MdWaterDrop,
  MdMonitorHeart,
  MdCampaign,
  MdNotificationsActive,
  MdCheckCircle,
  MdUpdate,
  MdInbox,
} from 'react-icons/md';
import '../../styles/ParentDashboard.css';
import '../../styles/PredictiveHeatReport.css';

const normalizeIncidentType = (value?: string): StudentHealthIncident['incidentType'] => {
  const allowedTypes: StudentHealthIncident['incidentType'][] = [
    'heat-exhaustion',
    'asthma-attack',
    'dehydration',
    'dizziness',
    'nausea',
    'headache',
    'other',
  ];

  return allowedTypes.includes(value as StudentHealthIncident['incidentType'])
    ? (value as StudentHealthIncident['incidentType'])
    : 'other';
};

const normalizeSeverity = (value?: string | null): StudentHealthIncident['severity'] => {
  if (value === 'mild' || value === 'moderate' || value === 'severe') {
    return value;
  }

  return 'moderate';
};

const normalizeStatus = (value?: string | null): StudentHealthIncident['status'] => {
  if (value === 'reported' || value === 'treated' || value === 'monitoring' || value === 'resolved') {
    return value;
  }

  return 'reported';
};

interface TodayTrendPoint {
  time: string;
  avgTemp: number;
  avgHumidity: number;
  avgHeatIndex: number;
}

const mapIncidentRecord = (incident: IncidentRecord): StudentHealthIncident => ({
  id: incident.id,
  studentName: incident.studentName,
  gradeLevel: incident.gradeLevel?.trim() || 'N/A',
  section: incident.section?.trim() || 'N/A',
  incidentType: normalizeIncidentType(incident.incidentType),
  severity: normalizeSeverity(incident.severity),
  symptoms: incident.symptoms ?? [],
  heatIndex: incident.heatIndex ?? 0,
  temperature: incident.temperature ?? 0,
  timestamp: incident.timestamp,
  actionTaken: incident.actionTaken ?? incident.description ?? 'No action recorded',
  reportedBy: incident.reporterName ?? incident.reportedBy ?? 'Unknown reporter',
  status: normalizeStatus(incident.status),
  resolvedAt: incident.resolvedAt ?? null,
});

const RESOLVED_VISIBILITY_MS = 24 * 60 * 60 * 1000;

const isVisibleToParent = (incident: StudentHealthIncident): boolean => {
  if (incident.status !== 'resolved') return true;
  const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : null;
  if (!resolvedAt || Number.isNaN(resolvedAt)) return true;
  return Date.now() - resolvedAt < RESOLVED_VISIBILITY_MS;
};

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [todayTrend, setTodayTrend] = useState<TodayTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParentPopup, setShowParentPopup] = useState(false);
  const [hasTriggeredInitialAlert, setHasTriggeredInitialAlert] = useState(false);
  const [incidentSearchTerm, setIncidentSearchTerm] = useState('');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<'all' | 'reported' | 'treated' | 'monitoring' | 'resolved'>('all');
  const [lastNotifiedLevel, setLastNotifiedLevel] = useState<string>('normal');

  const ANNOUNCEMENTS_PAGE_SIZE = 10;

  const [healthIncidents, setHealthIncidents] = useState<StudentHealthIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsOffset, setAnnouncementsOffset] = useState(0);
  const [announcementsHasMore, setAnnouncementsHasMore] = useState(true);
  const [announcementsLoadingMore, setAnnouncementsLoadingMore] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const announcementsListRef = useRef<HTMLDivElement | null>(null);
  const [aiAdvisory, setAiAdvisory] = useState<HealthAdvisory | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const data = await fetchCurrentWeather();
        if (data) {
          setCurrentWeather(data);
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchWeather();

    // Then poll every 1 minute
    const interval = setInterval(fetchWeather, 1 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTodayTrend = async () => {
      try {
        const { data } = await apiClient.get('/api/heat-index/history', { params: { period: 'daily' } });
        if (mounted && Array.isArray(data?.data)) {
          setTodayTrend(data.data);
        }
      } catch (error) {
        console.error('Failed to load today\'s heat index trend:', error);
      }
    };

    void loadTodayTrend();
    // Refresh alongside the live weather poll so the trend catches up as new
    // hourly readings get logged.
    const interval = setInterval(loadTodayTrend, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAdvisory = async () => {
      try {
        const data = await fetchRealtimeAdvisory();
        if (mounted) {
          setAiAdvisory(mapRealtimeAdvisory(data));
        }
      } catch (error) {
        console.error('Failed to load AI advisory:', error);
      }
    };

    void loadAdvisory();
    const interval = window.setInterval(loadAdvisory, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchAnnouncements(ANNOUNCEMENTS_PAGE_SIZE, 0);
        if (mounted) {
          setAnnouncements(data);
          setAnnouncementsOffset(data.length);
          setAnnouncementsHasMore(data.length === ANNOUNCEMENTS_PAGE_SIZE);
        }
      } catch (err) {
        // ignore
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const loadMoreAnnouncements = useCallback(async () => {
    if (announcementsLoadingMore || !announcementsHasMore) return;
    setAnnouncementsLoadingMore(true);
    try {
      const data = await fetchAnnouncements(ANNOUNCEMENTS_PAGE_SIZE, announcementsOffset);
      setAnnouncements((prev) => [...prev, ...data]);
      setAnnouncementsOffset((prev) => prev + data.length);
      setAnnouncementsHasMore(data.length === ANNOUNCEMENTS_PAGE_SIZE);
    } catch (err) {
      // ignore
    } finally {
      setAnnouncementsLoadingMore(false);
    }
  }, [announcementsLoadingMore, announcementsHasMore, announcementsOffset]);

  const handleAnnouncementsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      void loadMoreAnnouncements();
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIncidentsLoading(true);
        // Intentionally school-wide (not scoped to this parent's own
        // children) — parents use this to see whether any student had an
        // incident, not just their own kid.
        const data = await fetchIncidents(20, 0);
        if (mounted) setHealthIncidents(data.map(mapIncidentRecord).filter(isVisibleToParent));
      } catch (err) {
        if (mounted) setHealthIncidents([]);
      } finally {
        if (mounted) setIncidentsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const heatIndexData = useMemo<HeatIndexData>(() => {
    if (!currentWeather) {
      return {
        id: '1',
        schoolId: 'school-1',
        temperature: 0,
        humidity: 0,
        heatIndex: 0,
        level: 'normal' as const,
        timestamp: new Date().toISOString(),
      };
    }

    // Use the server's own heat index (feelsLike) instead of recomputing it
    // client-side — a local recalculation from raw temp/humidity can drift
    // from the server's value and disagree with the level it already
    // classified, which is exactly what the Heat Index card displays.
    const heatIndex = currentWeather.feelsLike;
    const level = getHeatLevel(heatIndex);

    return {
      id: '1',
      schoolId: 'school-1',
      temperature: currentWeather.temperature,
      humidity: currentWeather.humidity,
      heatIndex,
      level,
      timestamp: new Date().toISOString(),
    };
  }, [currentWeather]);

  const localAdvisory = useMemo<HealthAdvisory>(() => {
    const level = heatIndexData.level;
    return {
      id: '1',
      schoolId: 'school-1',
      heatLevel: level,
      title: `Heat Safety Advisory: ${level.toUpperCase().replace('-', ' ')}`,
      advisoryText: `Current heat index is ${heatIndexData.heatIndex.toFixed(1)}°C. Please follow the recommended safety measures.`,
      recommendations: DEPED_RECOMMENDATIONS[level],
      riskLevel: level === 'extreme-danger' || level === 'danger' ? 'critical' : level === 'extreme-caution' ? 'high' : 'medium',
      createdAt: new Date().toISOString(),
    };
  }, [heatIndexData]);

  const advisory = aiAdvisory ?? localAdvisory;

  useEffect(() => {
    const elevatedLevels = ['caution', 'extreme-caution', 'danger', 'extreme-danger'];
    const isElevated = elevatedLevels.includes(heatIndexData.level);

    if (isElevated && lastNotifiedLevel !== heatIndexData.level) {
      setShowParentPopup(true);
      setLastNotifiedLevel(heatIndexData.level);
    }

    if (!isElevated && lastNotifiedLevel !== 'normal') {
      setLastNotifiedLevel('normal');
    }
  }, [heatIndexData.level, lastNotifiedLevel]);

  useEffect(() => {
    if (hasTriggeredInitialAlert || loading || !currentWeather) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowParentPopup(true);
      setHasTriggeredInitialAlert(true);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [hasTriggeredInitialAlert, loading, currentWeather]);

  const parentPopupTitle = useMemo(() => {
    if (heatIndexData.level === 'danger' || heatIndexData.level === 'extreme-danger') {
      return 'High Heat Alert for Parents';
    }

    if (heatIndexData.level === 'extreme-caution') {
      return 'Elevated Heat Advisory';
    }

    return 'Heat Caution Notice';
  }, [heatIndexData.level]);

  // Routes "Ask AI Now" to the single global Smart AI Advisory Bot (see
  // App.tsx) instead of a second, separately-built chat — there used to be
  // two parallel AI chat UIs on this page, and the other one gave less
  // accurate answers since it duplicated (and drifted from) the real one.
  const openParentChat = (): void => {
    setShowParentPopup(false);
    window.dispatchEvent(new CustomEvent('bth:open-advisory-bot'));
  };

  // Real hourly heat index trend for today, fetched from the backend logs.
  const chartData = todayTrend.map((point) => ({
    time: formatDateTimeCompact(point.time),
    fullTime: formatDateTimeGlobal(point.time),
    temperature: point.avgTemp,
    humidity: point.avgHumidity,
    heatIndex: point.avgHeatIndex,
  }));

  const getParentFullTime = (label: string): string => {
    return chartData.find((point) => point.time === label)?.fullTime ?? label;
  };

  const filteredHealthIncidents = useMemo(() => {
    const normalized = incidentSearchTerm.trim().toLowerCase();

    return healthIncidents.filter((incident) => {
      const statusMatch = incidentStatusFilter === 'all' || incident.status === incidentStatusFilter;
      const searchableText = [incident.studentName, incident.gradeLevel, incident.section, incident.incidentType]
        .join(' ')
        .toLowerCase();
      const searchMatch = !normalized || searchableText.includes(normalized);

      return statusMatch && searchMatch;
    });
  }, [healthIncidents, incidentSearchTerm, incidentStatusFilter]);

  return (
    <div className="parent-dashboard">
      <div className="parent-dashboard-header">
        <div>
          <h1>Parent Monitoring Dashboard</h1>
          <p>Public view of current school weather and heat safety advisories.</p>
        </div>
        <div className="parent-header-actions">
          <div className="parent-header-badge">{loading ? 'Loading...' : 'Live Status'}</div>
        </div>
      </div>

      <div className="parent-dashboard-grid">
        <div className="parent-dashboard-main">
          <section className="parent-priority-row">
            <Card title="Student Incident Reports">
              <div className="parent-incidents-toolbar">
                <label className="parent-incidents-search">
                  <MdSearch />
                  <input
                    type="text"
                    value={incidentSearchTerm}
                    onChange={(event) => setIncidentSearchTerm(event.target.value)}
                    placeholder="Search student name, grade, or section"
                  />
                </label>

                <select
                  className="parent-incidents-filter"
                  value={incidentStatusFilter}
                  onChange={(event) => setIncidentStatusFilter(event.target.value as 'all' | 'reported' | 'treated' | 'monitoring' | 'resolved')}
                  aria-label="Filter incident status"
                  title="Filter incident status"
                >
                  <option value="all">All status</option>
                  <option value="reported">Reported</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="treated">Treated</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <p className="parent-incidents-meta">
                Showing {filteredHealthIncidents.length} of {healthIncidents.length} incident records.
              </p>

              <div className="parent-incidents-list">
                {incidentsLoading && (
                  <div className="parent-incidents-empty">Loading incidents...</div>
                )}

                {!incidentsLoading && filteredHealthIncidents.map((incident) => (
                  <article key={incident.id} className="parent-incident-item">
                    <div className="parent-incident-head">
                      <h4>{incident.studentName}</h4>
                      <span className={`parent-incident-status ${incident.status}`}>{incident.status}</span>
                    </div>
                    <p className="parent-incident-acad">{incident.gradeLevel} - {incident.section}</p>
                    <p className="parent-incident-detail">
                      {incident.incidentType.replace('-', ' ')} | {formatDateTimeGlobal(incident.timestamp)}
                    </p>
                  </article>
                ))}

                {!incidentsLoading && filteredHealthIncidents.length === 0 && (
                  <div className="parent-incidents-empty">
                    No matching student incident found. Try another name, grade, or section.
                  </div>
                )}
              </div>
            </Card>

            <div className="parent-priority-metrics">
              {currentWeather && (
                <>
                  <HeatIndexCard
                    heatIndex={heatIndexData.heatIndex}
                    humidity={heatIndexData.humidity}
                    level={heatIndexData.level}
                    lastUpdated={heatIndexData.timestamp}
                  />
                  <WeatherWidget weather={currentWeather} />
                </>
              )}
              {!currentWeather && <div className="loading-placeholder">Loading weather...</div>}
            </div>
          </section>

          <AdvisoryAlert advisory={advisory} />

          <PredictiveHeatReport role="parent" compact />

          <Card title="Heat Index Trend (Today)">
            {chartData.length > 0 && (
              <Chart
                data={chartData}
                type="line"
                dataKeys={[
                  { key: 'heatIndex', name: 'Heat Index (°C)', color: CHART_COLORS.heatIndex },
                  { key: 'temperature', name: 'Temperature (°C)', color: CHART_COLORS.temperature },
                ]}
                xAxisKey="time"
                xAxisAngle={-12}
                xAxisHeight={68}
                tooltipLabelFormatter={getParentFullTime}
                height={240}
              />
            )}
            {chartData.length === 0 && (
              <div className="empty-state">
                Waiting for weather data... (refreshes every minute)
              </div>
            )}
          </Card>
        </div>

        <div className="parent-dashboard-side">
          <Card title="School Status">
            <div className="parent-status">
              <div className="parent-status-row">
                <span className="parent-status-icon parent-status-icon-ok"><MdCheckCircle /></span>
                <div>
                  <span className="parent-status-label">Campus Condition</span>
                  <span className="parent-status-value parent-status-value-ok">Normal Operations</span>
                </div>
              </div>
              <div className="parent-status-row">
                <span className="parent-status-icon"><MdUpdate /></span>
                <div>
                  <span className="parent-status-label">Last Update</span>
                  <span className="parent-status-value">Just now</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Announcements"
            actions={
              <button
                type="button"
                className="parent-view-all-btn"
                onClick={() => navigate('/parent/announcements')}
              >
                View All
              </button>
            }
          >
            <div
              className="parent-announcements"
              ref={announcementsListRef}
              onScroll={handleAnnouncementsScroll}
            >
              {announcements.length === 0 && (
                <div className="parent-announcements-empty">
                  <MdInbox className="parent-announcements-empty-icon" />
                  <span>No announcements yet</span>
                </div>
              )}
              {announcements.map((a) => (
                <article
                  key={a.id}
                  className="parent-announcement-item parent-announcement-item-clickable"
                  onClick={() => setViewingAnnouncement(a)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingAnnouncement(a);
                    }
                  }}
                >
                  <span className="parent-announcement-icon"><MdNotificationsActive /></span>
                  <div className="parent-announcement-content">
                    <h4>{a.title}</h4>
                    <p className="parent-announcement-body">{a.body}</p>
                    <small className="parent-announcement-meta">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</small>
                  </div>
                </article>
              ))}
              {announcementsLoadingMore && (
                <div className="parent-announcements-loading-more">Loading more…</div>
              )}
            </div>
          </Card>

          <Card title="Quick Guidance">
            <ul className="parent-guidance">
              <li>
                <span className="parent-guidance-icon"><MdThermostat /></span>
                <span>Check heat index before outdoor activities.</span>
              </li>
              <li>
                <span className="parent-guidance-icon"><MdWaterDrop /></span>
                <span>Encourage students to drink water regularly.</span>
              </li>
              <li>
                <span className="parent-guidance-icon"><MdMonitorHeart /></span>
                <span>Monitor for dizziness or fatigue during high heat.</span>
              </li>
              <li>
                <span className="parent-guidance-icon"><MdCampaign /></span>
                <span>Follow school announcements for schedule changes.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {viewingAnnouncement && (
        <div
          className="parent-announcement-modal-backdrop"
          onClick={() => setViewingAnnouncement(null)}
        >
          <div className="parent-announcement-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="parent-announcement-modal-close"
              onClick={() => setViewingAnnouncement(null)}
              aria-label="Close"
            >
              <MdClose />
            </button>
            <span className="parent-announcement-modal-icon"><MdNotificationsActive /></span>
            <h3>{viewingAnnouncement.title}</h3>
            <small className="parent-announcement-meta">
              {viewingAnnouncement.created_at ? new Date(viewingAnnouncement.created_at).toLocaleString() : ''}
            </small>
            <p className="parent-announcement-modal-body">{viewingAnnouncement.body}</p>
          </div>
        </div>
      )}

      {showParentPopup && (
        <div className="parent-advisory-popup" role="alert">
          <button
            className="parent-popup-close"
            onClick={() => setShowParentPopup(false)}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <MdClose />
          </button>
          <p className="parent-popup-kicker">Parent Alert</p>
          <h3>{parentPopupTitle}</h3>
          <p>
            Current heat index is <strong>{heatIndexData.heatIndex.toFixed(1)}°C</strong> and level is{' '}
            <strong>{heatIndexData.level.replace('-', ' ')}</strong>. Ask AI what actions your child should follow today.
          </p>
          <div className="parent-popup-actions">
            <button className="parent-popup-btn primary" onClick={openParentChat}>
              Ask AI Now
            </button>
            <button className="parent-popup-btn" onClick={() => setShowParentPopup(false)}>
              Later
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
