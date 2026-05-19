import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdChat, MdClose } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { fetchCurrentWeather } from '../services/weather.service';
import { generateScopedAdvisory } from '../services/healthAdvisory.service';
import { calculateHeatIndex, getHeatLevel } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import '../styles/GlobalAdvisoryNudge.css';

const fallbackMessages = [
  'Ask me about heat index, student safety, and parent precautions.',
  'Need heat safety tips? Ask me anything about school advisories.',
  'Heat index is changing. Ask for quick guidance now.',
  'Ask me about today’s heat level and recommended actions.',
];

export const GlobalAdvisoryNudge: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nudgeText, setNudgeText] = useState(fallbackMessages[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const roleLabel = useMemo(() => user?.role ?? 'user', [user?.role]);
  const chatPath = useMemo(() => (user?.role === 'parent' ? '/parent/chatbot' : '/health-advisory'), [user?.role]);

  const refreshNudge = useCallback(async () => {
    try {
      const weather = await fetchCurrentWeather();
      const heatIndex = calculateHeatIndex(weather.temperature, weather.humidity);
      const level = getHeatLevel(heatIndex);

      const prompt = [
        `Give a single-sentence heat advisory for a ${roleLabel}.`,
        `Current temperature is ${weather.temperature.toFixed(1)}°C, heat index is ${heatIndex.toFixed(1)}°C (${level}).`,
        `Condition: ${weather.conditions}. Keep it short and practical.`,
      ].join(' ');

      const scoped = await generateScopedAdvisory(prompt);
      setNudgeText(scoped.summary);
    } catch (error) {
      setFallbackIndex((prev) => (prev + 1) % fallbackMessages.length);
      setNudgeText(fallbackMessages[(fallbackIndex + 1) % fallbackMessages.length]);
    }
  }, [fallbackIndex, roleLabel]);

  useEffect(() => {
    void refreshNudge();
    const interval = window.setInterval(() => {
      void refreshNudge();
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [refreshNudge]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    setIsThinking(true);
    setAnswer('');
    try {
      const scoped = await generateScopedAdvisory(trimmed);
      setAnswer([scoped.summary, '', `Risk level: ${scoped.riskLevel}`, scoped.scopeNote].join('\n'));
      setQuestion('');
    } catch (error) {
      setAnswer('The advisory service is unavailable. Please check the latest heat index and school guidance.');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="global-advisory-nudge">
      {isOpen && (
        <div className="global-advisory-panel" role="dialog" aria-label="AI advisory assistant">
          <div className="global-advisory-panel-header">
            <div className="global-advisory-panel-title">
              <MdChat />
              <span>AI Advisory</span>
            </div>
            <button
              className="global-advisory-close"
              onClick={() => setIsOpen(false)}
              title="Close advisory assistant"
              aria-label="Close advisory assistant"
            >
              <MdClose />
            </button>
          </div>

          <div className="global-advisory-panel-body">
            <p className="global-advisory-nudge-text">{nudgeText}</p>
            {answer && <pre className="global-advisory-answer">{answer}</pre>}
            <div className="global-advisory-input-row">
              <input
                type="text"
                placeholder="Ask about heat safety..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleAsk();
                  }
                }}
              />
              <button onClick={() => void handleAsk()} disabled={!question.trim() || isThinking}>
                {isThinking ? '...' : 'Send'}
              </button>
            </div>
            <button
              className="global-advisory-link"
              onClick={() => navigate(chatPath)}
              type="button"
            >
              Open full chatbot
            </button>
          </div>
        </div>
      )}

      <button
        className="global-advisory-button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Ask AI advisory"
        aria-label="Ask AI advisory"
      >
        <span className="global-advisory-pill">Ask me anything</span>
        <span className="global-advisory-message">{nudgeText}</span>
        <span className="global-advisory-icon">
          <MdChat />
        </span>
      </button>
    </div>
  );
};
