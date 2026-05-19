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
  const [isThinking, setIsThinking] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [messages, setMessages] = useState<Array<{ id: number; text: string; sender: 'user' | 'ai' }>>([]);

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

  useEffect(() => {
    setIsOpen(true);
    const interval = window.setInterval(() => {
      setIsOpen(true);
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    const userMessage = {
      id: Date.now(),
      text: trimmed,
      sender: 'user' as const,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    try {
      const scoped = await generateScopedAdvisory(trimmed);
      const actions = (scoped.actions ?? []).slice(0, 3).map((item) => `- ${item}`).join('\n');
      const tips = (scoped.safetyTips ?? []).slice(0, 3).map((item) => `- ${item}`).join('\n');
      const replyParts = [
        scoped.summary,
        '',
        'Recommended steps:',
        actions || '- Keep hydrated and avoid peak heat exposure.',
        '',
        'Quick safety tips:',
        tips || '- Follow school advisories and monitor symptoms.',
        '',
        scoped.scopeNote,
      ];
      const replyText = replyParts.join('\n');
      const aiMessage = {
        id: Date.now() + 1,
        text: replyText,
        sender: 'ai' as const,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setQuestion('');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'The advisory service is unavailable. Please check the latest heat index and school guidance.',
          sender: 'ai' as const,
        },
      ]);
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
              <span className="global-advisory-header-icon">🤖</span>
              <div>
                <h3>AI Heat Advisory Assistant</h3>
                <span className="global-advisory-status">
                  <span className="global-advisory-status-dot"></span>
                  System-Scoped Mode
                </span>
              </div>
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
            <div className="global-advisory-messages">
              <div className="global-advisory-message ai">
                <div className="global-advisory-avatar">🤖</div>
                <div className="global-advisory-bubble">{nudgeText}</div>
              </div>

              {messages.map((message) => (
                <div key={message.id} className={`global-advisory-message ${message.sender}`}>
                  {message.sender === 'ai' && <div className="global-advisory-avatar">🤖</div>}
                  <div className="global-advisory-bubble">{message.text}</div>
                  {message.sender === 'user' && <div className="global-advisory-avatar user">👤</div>}
                </div>
              ))}

              {isThinking && (
                <div className="global-advisory-message ai">
                  <div className="global-advisory-avatar">🤖</div>
                  <div className="global-advisory-bubble typing">AI is typing...</div>
                </div>
              )}
            </div>

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
        className="global-advisory-button icon-only"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Ask AI advisory"
        aria-label="Ask AI advisory"
      >
        <span className="global-advisory-icon">
          <MdChat />
        </span>
      </button>
    </div>
  );
};
