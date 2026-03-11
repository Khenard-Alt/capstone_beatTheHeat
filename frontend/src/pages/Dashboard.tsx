import React, { useState, useMemo } from 'react';
import { HeatIndexCard } from '../components/HeatIndexCard';
import { WeatherWidget } from '../components/WeatherWidget';
import { AdvisoryAlert } from '../components/AdvisoryAlert';
import { Chart } from '../components/Chart';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import type { HeatIndexData, WeatherData, HealthAdvisory, StudentHealthIncident } from '../types';
import { calculateHeatIndex, getHeatLevel, getGreeting } from '../utils/helpers';
import { CHART_COLORS, DEPED_RECOMMENDATIONS } from '../utils/constants';
import { FaHeartbeat, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import { MdLocalHospital } from 'react-icons/md';
import '../styles/Dashboard.css';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock data - replace with actual API calls
  const [currentWeather] = useState<WeatherData>({
    id: '1',
    schoolId: 'school-1',
    temperature: 35,
    humidity: 75,
    feelsLike: 38,
    conditions: 'Partly Cloudy',
    icon: '02d',
    windSpeed: 12.5,
    pressure: 1013,
    timestamp: new Date().toISOString(),
  });

  // Calculate heat index data
  const heatIndexData = useMemo<HeatIndexData>(() => {
    const heatIndex = calculateHeatIndex(currentWeather.temperature, currentWeather.humidity);
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

  // Generate advisory
  const advisory = useMemo<HealthAdvisory>(() => {
    const level = heatIndexData.level;
    return {
      id: '1',
      schoolId: 'school-1',
      heatLevel: level,
      title: `Heat Index Alert: ${level.toUpperCase().replace('-', ' ')}`,
      advisoryText: `Current heat index is ${heatIndexData.heatIndex.toFixed(1)}°C. Please follow the recommended safety measures.`,
      recommendations: DEPED_RECOMMENDATIONS[level],
      riskLevel: level === 'extreme-danger' || level === 'danger' ? 'critical' : level === 'extreme-caution' ? 'high' : 'medium',
      createdAt: new Date().toISOString(),
    };
  }, [heatIndexData]);

  // Mock chart data
  const chartData = [
    { time: '8:00', temperature: 28, humidity: 65, heatIndex: 29 },
    { time: '10:00', temperature: 31, humidity: 68, heatIndex: 34 },
    { time: '12:00', temperature: 34, humidity: 72, heatIndex: 39 },
    { time: '2:00', temperature: 35, humidity: 75, heatIndex: 42 },
    { time: '4:00', temperature: 33, humidity: 73, heatIndex: 38 },
    { time: '6:00', temperature: 30, humidity: 70, heatIndex: 33 },
  ];

  // Mock student health incidents
  const [healthIncidents] = useState<StudentHealthIncident[]>(() => {
    const now = Date.now();
    return [
      {
        id: '1',
        studentName: 'Maria Santos',
        gradeLevel: 'Grade 5',
        section: 'Mabini',
        incidentType: 'heat-exhaustion',
        severity: 'moderate',
        symptoms: ['Dizziness', 'Excessive sweating', 'Weakness'],
        heatIndex: 42,
        temperature: 35,
        timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
        actionTaken: 'Moved to shaded area, provided water and rest',
        reportedBy: 'Ms. Cruz',
        status: 'monitoring',
      },
      {
        id: '2',
        studentName: 'Juan Dela Cruz',
        gradeLevel: 'Grade 4',
        section: 'Rizal',
        incidentType: 'asthma-attack',
        severity: 'severe',
        symptoms: ['Difficulty breathing', 'Wheezing', 'Chest tightness'],
        heatIndex: 39,
        temperature: 34,
        timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
        actionTaken: 'Administered inhaler, contacted parents, monitoring in clinic',
        reportedBy: 'Ms. Reyes',
        status: 'treated',
      },
      {
        id: '3',
        studentName: 'Ana Garcia',
        gradeLevel: 'Grade 6',
        section: 'Bonifacio',
        incidentType: 'dehydration',
        severity: 'mild',
        symptoms: ['Dry mouth', 'Headache', 'Fatigue'],
        heatIndex: 38,
        temperature: 33,
        timestamp: new Date(now - 10800000).toISOString(), // 3 hours ago
        actionTaken: 'Provided oral rehydration solution, rest in cool area',
        reportedBy: 'Mr. Lopez',
        status: 'resolved',
      },
      {
        id: '4',
        studentName: 'Pedro Ramos',
        gradeLevel: 'Grade 3',
        section: 'Luna',
        incidentType: 'nausea',
        severity: 'mild',
        symptoms: ['Nausea', 'Dizziness', 'Pale skin'],
        heatIndex: 41,
        temperature: 35,
        timestamp: new Date(now - 1800000).toISOString(), // 30 mins ago
        actionTaken: 'Rest in clinic, cold compress applied',
        reportedBy: 'Ms. Santos',
        status: 'monitoring',
      },
    ];
  });

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'asthma-attack':
        return <MdLocalHospital style={{ color: '#ef4444' }} />;
      case 'heat-exhaustion':
        return <FaExclamationTriangle style={{ color: '#f97316' }} />;
      case 'dehydration':
        return <FaHeartbeat style={{ color: '#f59e0b' }} />;
      default:
        return <FaHeartbeat style={{ color: '#06b6d4' }} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      reported: { icon: <FaClock />, color: '#6b7280', label: 'Reported' },
      treated: { icon: <FaCheckCircle />, color: '#10b981', label: 'Treated' },
      monitoring: { icon: <FaExclamationTriangle />, color: '#f59e0b', label: 'Monitoring' },
      resolved: { icon: <FaCheckCircle />, color: '#059669', label: 'Resolved' },
    };
    return badges[status as keyof typeof badges] || badges.reported;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return '#ef4444';
      case 'moderate':
        return '#f97316';
      case 'mild':
        return '#fbbf24';
      default:
        return '#6b7280';
    }
  };

  const formatTimeAgo = useMemo(() => {
    return (timestamp: string) => {
      const now = Date.now();
      const time = new Date(timestamp).getTime();
      const diffMs = now - time;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      return new Date(timestamp).toLocaleDateString();
    };
  }, []);


  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1>Dashboard</h1>
          <p className="dashboard-greeting">
            {getGreeting()}, {user?.firstName}!
          </p>
        </div>
        {/* Quick Stats in Header */}
        <div className="dashboard-quick-stats">
          <div className="quick-stat-item">
            <div className="quick-stat-value">35°C</div>
            <div className="quick-stat-label">Temp</div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-value">75%</div>
            <div className="quick-stat-label">Humidity</div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-value">{heatIndexData.heatIndex.toFixed(1)}°C</div>
            <div className="quick-stat-label">Heat Index</div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-value text-danger">
              {healthIncidents.filter(i => i.status !== 'resolved').length}
            </div>
            <div className="quick-stat-label">Active Cases</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col-main">
          <div className="dashboard-top-row">
            <HeatIndexCard
              heatIndex={heatIndexData.heatIndex}
              temperature={heatIndexData.temperature}
              humidity={heatIndexData.humidity}
              level={heatIndexData.level}
              lastUpdated={heatIndexData.timestamp}
            />
            <WeatherWidget weather={currentWeather} />
          </div>

          <AdvisoryAlert advisory={advisory} />

          <Card title="Heat Index Trends - Today">
            <Chart
              data={chartData}
              type="line"
              dataKeys={[
                { key: 'heatIndex', name: 'Heat Index (°C)', color: CHART_COLORS.heatIndex },
                { key: 'temperature', name: 'Temperature (°C)', color: CHART_COLORS.temperature },
              ]}
              xAxisKey="time"
              height={240}
            />
          </Card>
        </div>

        <div className="dashboard-col-sidebar">
          {/* Student Health Incidents Section - Compact */}
          <Card title="Health Incidents Today">
            <div className="health-incidents-mini-stats">
              <div className="mini-stat">
                <span className="mini-stat-value">{healthIncidents.length}</span>
                <span className="mini-stat-label">Total</span>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-value text-danger">
                  {healthIncidents.filter(i => i.severity === 'severe').length}
                </span>
                <span className="mini-stat-label">Severe</span>
              </div>
              <div className="mini-stat">
                <span className="mini-stat-value text-success">
                  {healthIncidents.filter(i => i.status === 'resolved').length}
                </span>
                <span className="mini-stat-label">Resolved</span>
              </div>
            </div>

            <div className="health-incidents-compact-list">
              {healthIncidents.map((incident) => (
                <div key={incident.id} className="health-incident-compact-card">
                  <div className="incident-compact-header">
                    <div className="incident-compact-left">
                      <div className="incident-type-icon-small">
                        {getIncidentIcon(incident.incidentType)}
                      </div>
                      <div>
                        <h5 className="incident-name-compact">{incident.studentName}</h5>
                        <p className="incident-grade-compact">{incident.gradeLevel} - {incident.section}</p>
                      </div>
                    </div>
                    <div className="incident-compact-badges">
                      <span
                        className="severity-badge-mini"
                        data-severity={incident.severity}
                      >
                        {incident.severity}
                      </span>
                      <span
                        className="status-badge-mini"
                        data-status={incident.status}
                      >
                        {getStatusBadge(incident.status).icon}
                      </span>
                    </div>
                  </div>
                  <div className="incident-compact-info">
                    <div className="incident-info-row">
                      <span className="info-label">Type:</span>
                      <span>{incident.incidentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                    <div className="incident-info-row">
                      <span className="info-label">Status:</span>
                      <span>{incident.actionTaken}</span>
                    </div>
                    <div className="incident-compact-time">
                      <FaClock />
                      <span>{formatTimeAgo(incident.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {healthIncidents.length === 0 && (
              <div className="no-incidents-compact">
                <FaCheckCircle />
                <p>No incidents today</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
