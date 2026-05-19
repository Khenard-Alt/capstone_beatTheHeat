import React, { useEffect, useMemo, useState } from 'react';
import { MdChat } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();
  const [advisory, setAdvisory] = useState<AdvisoryState | null>(null);
  const [tick, setTick] = useState(0);
  const [isAttention, setIsAttention] = useState(true);

  useEffect(() => {
    let mounted = true;
    let attentionTimeout: number | undefined;

    const triggerAttention = () => {
      setIsAttention(true);
      if (attentionTimeout) {
        window.clearTimeout(attentionTimeout);
      }
      attentionTimeout = window.setTimeout(() => {
        setIsAttention(false);
      }, 8000);
    };

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
    triggerAttention();
    const interval = setInterval(() => {
      void load();
      triggerAttention();
      setTick((prev) => prev + 1);
    }, 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (attentionTimeout) {
        window.clearTimeout(attentionTimeout);
      }
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

  return (
    <button
      className={`floating-advisory-header${isAttention ? ' attention' : ''}`}
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
