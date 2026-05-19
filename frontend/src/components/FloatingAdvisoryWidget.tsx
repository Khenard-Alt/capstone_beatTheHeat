import React, { useEffect, useMemo, useState } from 'react';
import { MdChat } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchRealtimeAdvisory } from '../services/healthAdvisory.service';
import { useAuth } from '../hooks/useAuth';
import '../styles/FloatingAdvisoryWidget.css';

interface AdvisoryState {
  summary: string;
  actions: string[];
  safetyTips: string[];
  riskLevel: string;
  generatedAt: string;
}

export const FloatingAdvisoryWidget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [advisory, setAdvisory] = useState<AdvisoryState | null>(null);
  const [tick, setTick] = useState(0);

  const isDashboardRoute = useMemo(() => {
    const path = location.pathname;
    const dashboardPaths = [
      '/dashboard',
      '/parent/dashboard',
      '/admin',
      '/principal/dashboard',
      '/head-teacher/dashboard',
      '/teacher/dashboard',
    ];
    return dashboardPaths.includes(path);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchRealtimeAdvisory();
        if (mounted) {
          setAdvisory({
            summary: data.summary,
            actions: data.actions ?? [],
            safetyTips: data.safetyTips ?? [],
            riskLevel: data.riskLevel,
            generatedAt: data.generatedAt,
          });
        }
      } catch (_) {
        if (mounted) {
          setAdvisory(null);
        }
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
      setTick((prev) => prev + 1);
    }, 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const message = useMemo(() => {
    if (!advisory) {
      return 'Fetching the latest heat advisory...';
    }

    const tips = [...(advisory.actions || []), ...(advisory.safetyTips || [])].filter(Boolean);
    if (tips.length === 0) {
      return advisory.summary;
    }

    const index = tick % tips.length;
    return `${advisory.summary} ${tips[index]}`;
  }, [advisory, tick]);

  const handleOpen = () => {
    if (user?.role === 'parent') {
      navigate('/parent/chatbot');
      return;
    }

    if (user) {
      navigate('/health-advisory');
      return;
    }

    navigate('/login');
  };

  if (!isDashboardRoute) {
    return null;
  }

  return (
    <button
      className="floating-advisory-header"
      onClick={handleOpen}
      title="Open advisory chatbot"
      aria-label="Open advisory chatbot"
    >
      <span className="floating-advisory-header-left">
        <span className="floating-advisory-badge">Advisory</span>
        <span className="floating-advisory-text">{message}</span>
      </span>
      <span className="floating-advisory-icon">
        <MdChat />
      </span>
      {advisory?.generatedAt && (
        <span className="floating-advisory-time">
          Updated {new Date(advisory.generatedAt).toLocaleTimeString()}
        </span>
      )}
    </button>
  );
};
