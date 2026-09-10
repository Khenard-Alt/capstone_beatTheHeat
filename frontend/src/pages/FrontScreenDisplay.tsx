import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/api';
import { fetchAnnouncements, type Announcement } from '../services/announcements.service';
import { HEAT_COLORS, HEAT_LABELS, SCHOOL_INFO, normalizeHeatLevel } from '../utils/constants';
import { Chart } from '../components/Chart';
import schoolLogo from '../assets/mayamotlogo.png';
import depedLogo from '../assets/depedlogo/deped-logo.png';
import highTempIcon from '../assets/dashboard/hightemperate.svg';
import moderateTempIcon from '../assets/dashboard/moderateTemperature.svg';
import normalTempIcon from '../assets/dashboard/normalTemperature.svg';
import sunnyIcon from '../assets/dashboard/Wsunny.svg';
import cloudyIcon from '../assets/dashboard/Wcloudy.svg';
import rainyIcon from '../assets/dashboard/Wrainy.svg';
import carousel1 from '../assets/frontScreenCarousel/1.png';
import carousel2 from '../assets/frontScreenCarousel/2.jpg';
import carousel3 from '../assets/frontScreenCarousel/3.jpg';
import '../styles/FrontScreenDisplay.css';

const ADVISORY_CAROUSEL_IMAGES = [carousel1, carousel2, carousel3];
const ADVISORY_CAROUSEL_INTERVAL_MS = 8000;

const HEAT_LEVEL_ICONS: Record<ReturnType<typeof normalizeHeatLevel>, string> = {
  normal: normalTempIcon,
  caution: moderateTempIcon,
  'extreme-caution': moderateTempIcon,
  danger: highTempIcon,
  'extreme-danger': highTempIcon,
};

const conditionToIcon = (condition: string): string => {
  const value = condition.toLowerCase();
  if (/(rain|drizzle|storm|thunder|shower|snow|sleet)/.test(value)) return rainyIcon;
  if (/(cloud|overcast|mist|haze|fog|smoke)/.test(value)) return cloudyIcon;
  return sunnyIcon;
};

interface CurrentSnapshot {
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  heatLevel: string;
  condition: string;
  timestamp: string;
}

interface CampusAlert {
  active: boolean;
  title: string;
  message: string;
}

interface ForecastDay {
  date: string;
  temperatureC: number;
  humidityPercent: number;
  heatIndexC: number;
  heatLevel: string;
}

const formatShortDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Kept short — the suspension banner is a live public-facing alert, so it
// must reflect what the principal just toggled within a few seconds, not
// wait a full minute.
const REFRESH_MS = 10 * 500;

const ADVISORY_COPY: Record<ReturnType<typeof normalizeHeatLevel>, { title: string; body: string }> = {
  normal: {
    title: 'NORMAL CONDITIONS',
    body: 'Heat levels are safe. Regular classes and activities continue as scheduled.',
  },
  caution: {
    title: 'CAUTION',
    body: 'Heat levels are elevated. Students should stay hydrated and limit strenuous outdoor activity.',
  },
  'extreme-caution': {
    title: 'EXTREME CAUTION',
    body: 'Outdoor activities are being minimized. Frequent water breaks are required.',
  },
  danger: {
    title: 'OUTDOOR ACTIVITIES SUSPENDED',
    body: 'Heat index has reached a dangerous level. All outdoor activities are suspended until further notice.',
  },
  'extreme-danger': {
    title: 'CLASS SUSPENSION ADVISORY',
    body: 'Extreme heat detected. Please coordinate with school administration regarding possible class suspension.',
  },
};

export const FrontScreenDisplay: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<CurrentSnapshot | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [campusAlert, setCampusAlert] = useState<CampusAlert | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const carouselTimer = setInterval(() => {
      setCarouselIndex((idx) => (idx + 1) % ADVISORY_CAROUSEL_IMAGES.length);
    }, ADVISORY_CAROUSEL_INTERVAL_MS);
    return () => clearInterval(carouselTimer);
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [weatherRes, announcementsRes, alertRes, forecastRes] = await Promise.all([
          apiClient.get('/api/weather/current'),
          fetchAnnouncements(6, 0),
          apiClient.get('/api/campus-alert'),
          apiClient.get('/api/weather/forecast', { params: { days: 5 } }),
        ]);

        if (!mounted) return;

        const data = weatherRes.data?.data;
        if (data) {
          setWeather({
            temperatureC: data.temperatureC ?? 0,
            humidityPercent: data.humidityPercent ?? 0,
            heatIndexC: data.heatIndexC ?? 0,
            heatLevel: data.heatLevel ?? 'normal',
            condition: data.condition ?? '',
            timestamp: data.timestamp ?? new Date().toISOString(),
          });
        }

        setAnnouncements(announcementsRes);

        const alertData = alertRes.data?.data;
        if (alertData) {
          setCampusAlert({
            active: Boolean(alertData.active),
            title: alertData.title || 'CLASS SUSPENSION',
            message: alertData.message || '',
          });
        }

        setForecast(Array.isArray(forecastRes.data?.data?.days) ? forecastRes.data.data.days : []);

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Front screen display failed to refresh:', error);
      }
    };

    void load();
    const refreshTimer = setInterval(load, REFRESH_MS);

    // Instant same-origin sync: if a Principal Settings tab is open in the
    // same browser, it pings this key the moment the suspension banner is
    // toggled, so the public display doesn't wait for the next poll.
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'campus-alert-updated-at') void load();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      clearInterval(refreshTimer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const level = normalizeHeatLevel(weather?.heatLevel);
  const advisory = ADVISORY_COPY[level];
  const isSevere = level === 'danger' || level === 'extreme-danger';
  const suspensionActive = Boolean(campusAlert?.active);

  // Memoized off `announcements` only — the ticker must not be rebuilt every
  // second just because the clock (`now`) re-renders the component, or the
  // marquee visibly stutters/restarts.
  const tickerItems = useMemo(
    () =>
      [
        `Welcome to ${SCHOOL_INFO.NAME}!`,
        ...announcements.slice(0, 4).map((a) => a.title),
      ].filter(Boolean),
    [announcements]
  );
  // Repeated enough times that the total track is always wider than the
  // screen, so the seamless-loop point (translateX(-50%)) never becomes
  // visible even when there's only one short item.
  const tickerRepeatCount = Math.max(2, Math.ceil(12 / Math.max(1, tickerItems.length)));
  const tickerLoop = useMemo(
    () => Array.from({ length: tickerRepeatCount }, () => tickerItems).flat(),
    [tickerItems, tickerRepeatCount]
  );
  // Speed scales with content so short and long ticker lists both scroll at
  // a comfortable, readable pace instead of a fixed duration.
  const tickerDurationSec = Math.max(20, tickerItems.length * 8);

  const upcomingPeakDays = useMemo(
    () => forecast.filter((day) => normalizeHeatLevel(day.heatLevel) !== 'normal'),
    [forecast]
  );

  return (
    <div className="front-screen">
      <header className="front-screen-header">
        <div className="front-screen-brand">
          <div className="front-screen-logo-group">
            <img className="front-screen-logo" src={depedLogo} alt="Department of Education logo" />
            <img className="front-screen-logo" src={schoolLogo} alt={`${SCHOOL_INFO.NAME} logo`} />
          </div>
          <div>
            <span className="front-screen-brand-title">Beat The Heat</span>
            <span className="front-screen-brand-subtitle">{SCHOOL_INFO.NAME}</span>
          </div>
        </div>
        <div className="front-screen-clock">
          <span className="front-screen-time">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
          <span className="front-screen-date">{now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      {tickerItems.length > 0 && (
        <div className="front-screen-ticker">
          <div
            className="front-screen-ticker-track"
            style={{
              // Move by exactly one "tickerItems" cycle's share of the fully
              // repeated track, so the wrap-around point is never visible.
              ['--ticker-loop-x' as string]: `${-100 / tickerRepeatCount}%`,
              animationDuration: `${tickerDurationSec}s`,
            }}
          >
            {tickerLoop.map((item, idx) => (
              <span key={`${item}-${idx}`} className="front-screen-ticker-item">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="front-screen-body">
      <main className="front-screen-main">
        <section className="front-screen-advisory-col">
          {suspensionActive ? (
            <div
              className="front-screen-advisory-banner front-screen-suspension-banner"
              style={{ background: HEAT_COLORS['extreme-danger'] }}
            >
              <div className="front-screen-advisory-carousel" aria-hidden="true">
                {ADVISORY_CAROUSEL_IMAGES.map((src, idx) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={`front-screen-advisory-carousel-img ${idx === carouselIndex ? 'is-active' : ''}`}
                  />
                ))}
                <div className="front-screen-advisory-scrim" />
              </div>
              <div className="front-screen-advisory-content">
                <span className="front-screen-advisory-eyebrow">URGENT</span>
                <h1>{campusAlert?.title || 'CLASS SUSPENSION'}</h1>
                <p>{campusAlert?.message}</p>
              </div>
            </div>
          ) : (
            <div className={`front-screen-advisory-banner level-${level}`} style={{ background: HEAT_COLORS[level] }}>
              <div className="front-screen-advisory-carousel" aria-hidden="true">
                {ADVISORY_CAROUSEL_IMAGES.map((src, idx) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={`front-screen-advisory-carousel-img ${idx === carouselIndex ? 'is-active' : ''}`}
                  />
                ))}
                <div className="front-screen-advisory-scrim" />
              </div>
              <div className="front-screen-advisory-content">
                <span className="front-screen-advisory-eyebrow">{isSevere ? 'URGENT' : 'HEAT ADVISORY'}</span>
                <h1>{advisory.title}</h1>
                <p>{advisory.body}</p>
              </div>
            </div>
          )}

          <div className="front-screen-announcements">
            <h2>Announcements</h2>
            {announcements.length === 0 ? (
              <p className="front-screen-empty">No announcements right now.</p>
            ) : (
              <ul>
                {announcements.map((item) => (
                  <li key={item.id}>
                    <span className={`front-screen-announcement-badge priority-${item.priority ?? 'info'}`}>
                      {(item.priority ?? 'info').toUpperCase()}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="front-screen-weather-col">
          <p className="front-screen-location">{SCHOOL_INFO.ADDRESS}</p>

          {weather ? (
            /* Heat Index leads — it's the actual subject of this study, so
               it must never be secondary to plain weather stats. Weather is
               folded into the same card as supporting context underneath. */
            <div className={`front-screen-metric-card level-${level}`}>
              <div className="front-screen-metric-header">
                <h2>Current Heat Index</h2>
                <span className="front-screen-weather-badge" style={{ background: HEAT_COLORS[level] }}>
                  {HEAT_LABELS[level]}
                </span>
              </div>
              <img className="front-screen-advisory-icon" src={HEAT_LEVEL_ICONS[level]} alt="" aria-hidden="true" />
              <span className="front-screen-metric-value" style={{ color: HEAT_COLORS[level] }}>
                {weather.heatIndexC.toFixed(1)}°C
              </span>
              <span className="front-screen-metric-label">Heat Index</span>

              <div className="front-screen-weather-subrow">
                <img className="front-screen-weather-icon-small" src={conditionToIcon(weather.condition)} alt="" aria-hidden="true" />
                <div>
                  <span className="front-screen-metric-value-blue">{weather.temperatureC.toFixed(0)}°C</span>
                  <span className="front-screen-metric-label">{weather.condition}</span>
                </div>
              </div>

              <div className="front-screen-weather-grid">
                <div>
                  <span className="front-screen-weather-label">Humidity</span>
                  <span className="front-screen-weather-value">{weather.humidityPercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="front-screen-empty">Loading weather…</p>
          )}

          <div className="front-screen-future">
            <h2>Future Heat Outlook</h2>
            <div className="front-screen-future-legend">
              {(Object.keys(HEAT_LABELS) as Array<keyof typeof HEAT_LABELS>).map((lvl) => (
                <span key={lvl} className="front-screen-future-chip" style={{ background: HEAT_COLORS[lvl] }}>
                  {HEAT_LABELS[lvl]}
                </span>
              ))}
            </div>

            {forecast.length === 0 ? (
              <p className="front-screen-empty">Forecast data is unavailable right now.</p>
            ) : (
              <>
                <div className="front-screen-future-chart">
                  <Chart
                    data={forecast}
                    type="bar"
                    dataKeys={[{ key: 'heatIndexC', name: 'Forecast Heat Index (°C)', color: HEAT_COLORS['extreme-caution'] }]}
                    xAxisKey="date"
                    height={180}
                    xAxisTickFormatter={formatShortDate}
                    tooltipLabelFormatter={formatShortDate}
                  />
                </div>

                {upcomingPeakDays.length > 0 ? (
                  <div className="front-screen-future-peaks">
                    <span className="front-screen-future-peaks-label">Upcoming peak-heat days</span>
                    <ul>
                      {upcomingPeakDays.map((day) => {
                        const dayLevel = normalizeHeatLevel(day.heatLevel);
                        return (
                          <li key={day.date}>
                            <span className="front-screen-future-chip front-screen-future-chip-inline" style={{ background: HEAT_COLORS[dayLevel] }}>
                              {HEAT_LABELS[dayLevel]}
                            </span>{' '}
                            {formatShortDate(day.date)} — {day.heatIndexC.toFixed(1)}°C expected
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="front-screen-insight">No caution-level or higher days expected in the next {forecast.length} days.</p>
                )}
              </>
            )}
          </div>
        </aside>
      </main>
      </div>

      <footer className="front-screen-footer">
        <span>CCS Digital Campus Hub • Beat The Heat</span>
        <span className="front-screen-status">
          <span className="front-screen-status-dot" />
          {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Connecting…'}
        </span>
      </footer>
    </div>
  );
};
