import React, { useEffect, useMemo, useState } from 'react';
import { MdBolt, MdCampaign, MdCheckCircle, MdOutlineThermostat } from 'react-icons/md';
import { Card } from '../../components/Card';
import { fetchHealthAdvisories, fetchRealtimeAdvisory, type LoggedAdvisory, type RealtimeAdvisoryResponse } from '../../services/healthAdvisory.service';
import '../../styles/TeacherPanel.css';

const Advisories: React.FC = () => {
  const [realtimeAdvisory, setRealtimeAdvisory] = useState<RealtimeAdvisoryResponse | null>(null);
  const [advisories, setAdvisories] = useState<LoggedAdvisory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [realtime, history] = await Promise.all([
          fetchRealtimeAdvisory(),
          fetchHealthAdvisories(8, 0),
        ]);

        if (mounted) {
          setRealtimeAdvisory(realtime);
          setAdvisories(history);
        }
      } catch (error) {
        console.error('Failed to load teacher advisories:', error);
        if (mounted) {
          setAdvisories([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const advisoryCards = useMemo(() => [
    {
      label: 'Current Heat Level',
      value: realtimeAdvisory?.riskLevel?.toUpperCase() || 'DANGER',
      note: 'Live school weather context',
    },
    {
      label: 'Recommended Actions',
      value: realtimeAdvisory?.actions.length || 3,
      note: 'Practical steps for class safety',
    },
    {
      label: 'Safety Tips',
      value: realtimeAdvisory?.safetyTips.length || 3,
      note: 'Quick reminders for students',
    },
    {
      label: 'Logged Advisories',
      value: advisories.length,
      note: 'Historical advisory feed',
    },
  ], [advisories.length, realtimeAdvisory]);

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Heat Advisories</h1>
          <p>Use this page to brief yourself before class, pull the latest advisory, and review logged school guidance.</p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineThermostat className="teacher-hero-icon" />
          <div>
            <strong>{realtimeAdvisory?.riskLevel || 'danger'}</strong>
            <p>{realtimeAdvisory?.summary || 'Current heat advisory is loading.'}</p>
          </div>
        </div>
      </div>

      <div className="teacher-stats-grid">
        {advisoryCards.map((stat) => (
          <Card key={stat.label} className="teacher-stat-card">
            <div className="teacher-stat-label">{stat.label}</div>
            <div className="teacher-stat-value">{stat.value}</div>
            <div className="teacher-stat-note">{stat.note}</div>
          </Card>
        ))}
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Live Advisory" className="teacher-panel-card tone-alert">
            {loading ? (
              <div className="teacher-info-copy">Loading advisory...</div>
            ) : (
              <div className="teacher-grid-two">
                <div>
                  <div className="teacher-pill-list" style={{ marginBottom: 14 }}>
                    <span className="teacher-pill accent"><MdBolt /> High heat alert</span>
                    <span className="teacher-pill"><MdCheckCircle /> Keep class indoor</span>
                  </div>
                  <p className="teacher-info-copy">{realtimeAdvisory?.summary || 'Use caution and keep students hydrated.'}</p>
                </div>
                <div className="teacher-info-card">
                  <div className="teacher-info-label">Scope note</div>
                  <div className="teacher-info-copy">{realtimeAdvisory?.scopeNote || 'Advisory is based on live weather data and school safety inputs.'}</div>
                </div>
              </div>
            )}
          </Card>

          <Card title="Recommended Actions" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              {(realtimeAdvisory?.actions || [
                'Move outdoor tasks indoors or shorten them.',
                'Set up water access in every room.',
                'Check students for heat stress symptoms regularly.',
              ]).map((item) => (
                <div key={item} className="teacher-info-card">
                  <div className="teacher-info-label">Action</div>
                  <div className="teacher-info-copy">{item}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Logged Advisories" className="teacher-panel-card">
            {advisories.length === 0 ? (
              <div className="teacher-info-copy">No advisory logs yet. Once generated, they will appear here for quick reference.</div>
            ) : (
              <div className="teacher-section-grid">
                {advisories.map((entry) => (
                  <div key={entry.id} className="teacher-info-card">
                    <div className="teacher-info-label">{new Date(entry.created_at).toLocaleString()}</div>
                    <div className="teacher-info-value" style={{ fontSize: 16 }}>{entry.risk_level || 'advisory'}</div>
                    <div className="teacher-info-copy">{entry.response.slice(0, 180)}...</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="Teacher heat guide" className="teacher-panel-card">
            <ul className="teacher-list">
              <li>Use the live advisory before outdoor classes.</li>
              <li>Keep a spare water supply and cool towel in the room.</li>
              <li>Share the advisory with co-teachers if your class is split.</li>
            </ul>
          </Card>

          <Card title="School reminder" className="teacher-panel-card tone-alert">
            <div className="teacher-sidebar-note">
              Danger-level heat means safety comes first: indoor alternatives, hydration breaks, and a fast report if symptoms appear.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Advisories;