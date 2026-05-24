import React, { useEffect, useState } from 'react';
import { MdAutoAwesome, MdCampaign, MdOutlineThermostat } from 'react-icons/md';
import { Card } from '../../components/Card';
import { fetchHealthAdvisories, fetchRealtimeAdvisory, type LoggedAdvisory, type RealtimeAdvisoryResponse } from '../../services/healthAdvisory.service';
import '../../styles/TeacherPanel.css';

const Advisories: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [liveAdvisory, setLiveAdvisory] = useState<RealtimeAdvisoryResponse | null>(null);
  const [advisories, setAdvisories] = useState<LoggedAdvisory[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [live, history] = await Promise.all([
          fetchRealtimeAdvisory(),
          fetchHealthAdvisories(10, 0),
        ]);

        if (!mounted) {
          return;
        }

        setLiveAdvisory(live);
        setAdvisories(history);
      } catch (error) {
        console.error('Failed to load head teacher advisories:', error);
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

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Head teacher panel</p>
          <h1>Heat Advisories</h1>
          <p>Current heat advisories and recommended actions for school operations, aligned with the school palette and incident workflow.</p>
        </div>
        <div className="teacher-hero-card">
          <MdOutlineThermostat className="teacher-hero-icon" />
          <div>
            <strong>{liveAdvisory?.riskLevel?.toUpperCase() || 'DANGER'}</strong>
            <p>{liveAdvisory?.summary || 'Realtime advisory loading...'}</p>
          </div>
        </div>
      </div>

      <div className="teacher-layout">
        <div className="teacher-main">
          <Card title="Active Advisories" className="teacher-panel-card tone-alert">
            {loading ? (
              <div className="teacher-info-copy">Loading advisories...</div>
            ) : (
              <div className="teacher-section-grid">
                <div className="teacher-info-card">
                  <div className="teacher-info-label">Live advisory</div>
                  <div className="teacher-info-value" style={{ fontSize: 16 }}>{liveAdvisory?.riskLevel || 'danger'}</div>
                  <div className="teacher-info-copy">{liveAdvisory?.summary || 'No active advisory available.'}</div>
                  <div className="teacher-pill-list" style={{ marginTop: 12 }}>
                    {(liveAdvisory?.actions || []).slice(0, 3).map((action) => (
                      <span key={action} className="teacher-pill accent"><MdAutoAwesome /> {action}</span>
                    ))}
                  </div>
                </div>

                <div className="teacher-info-card">
                  <div className="teacher-info-label">Recommended actions</div>
                  <ul className="teacher-list">
                    <li>Pause outdoor PE and prolonged activities when the heat level is elevated.</li>
                    <li>Keep hydration messages visible for teachers and parents.</li>
                    <li>Escalate repeat symptoms to incident review immediately.</li>
                  </ul>
                </div>
              </div>
            )}
          </Card>

          <Card title="Logged Advisories" className="teacher-panel-card">
            {advisories.length === 0 ? (
              <div className="teacher-info-copy">No advisory history available.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {advisories.map((advisory) => (
                  <article key={advisory.id} className="teacher-info-card">
                    <div className="teacher-info-label">{advisory.decision_basis?.heatLevel || 'Advisory'}</div>
                    <div className="teacher-info-copy" style={{ whiteSpace: 'pre-line' }}>{advisory.response}</div>
                    <div className="teacher-info-label" style={{ marginTop: 10 }}>{advisory.created_at}</div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="teacher-side">
          <Card title="Advisory Summary" className="teacher-panel-card tone-success">
            <div className="teacher-section-grid">
              <div className="teacher-info-card">
                <div className="teacher-info-label"><MdCampaign /> School coordination</div>
                <div className="teacher-info-copy">Use these advisories when sending guidance to principals, teachers, and parents.</div>
              </div>
              <div className="teacher-info-card">
                <div className="teacher-info-label"><MdOutlineThermostat /> Heat level</div>
                <div className="teacher-info-copy">Keep the current risk level visible on the dashboard.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Advisories;
