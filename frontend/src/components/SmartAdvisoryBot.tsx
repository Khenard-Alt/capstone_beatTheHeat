import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdChat, MdClose } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { fetchCurrentWeather } from '../services/weather.service';
import { generateScopedAdvisory, fetchRealtimeAdvisory } from '../services/healthAdvisory.service';
import { calculateHeatIndex, getHeatLevel } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import '../styles/SmartAdvisoryBot.css';

const fallbackMessages = [
  'Ask me about heat index, student safety, and parent precautions.',
  'Need heat safety tips? Ask me anything about school advisories.',
  'Heat index is changing. Ask for quick guidance now.',
  'Ask me about today�s heat level and recommended actions.',
];

export const SmartAdvisoryBot: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nudgeText, setNudgeText] = useState(fallbackMessages[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [messages, setMessages] = useState<Array<{ id: number; text: string; sender: 'user' | 'ai' }>>([]);
  const [tickerMessage, setTickerMessage] = useState('Fetching the latest heat advisory...');
  const [isAttention, setIsAttention] = useState(true);

  const roleLabel = useMemo(() => user?.role ?? 'user', [user?.role]);
  const chatPath = useMemo(() => (user?.role === 'parent' ? '/parent/chatbot' : '/health-advisory'), [user?.role]);

  // Load standard real-time advisory for the floating ticker pill
  useEffect(() => {
    let mounted = true;
    let tick = 0;
    let attentionTimeout: number | undefined;

    const triggerAttention = () => {
      setIsAttention(true);
      if (attentionTimeout) window.clearTimeout(attentionTimeout);
      attentionTimeout = window.setTimeout(() => setIsAttention(false), 8000);
    };

    const loadTicker = async () => {
      try {
        const data = await fetchRealtimeAdvisory();
        if (!mounted) return;
        const tips = [...(data.actions || []), ...(data.safetyTips || [])].filter(Boolean);
        let currentMsg = data.summary;
        if (tips.length > 0) {
          const index = tick % tips.length;
          currentMsg = `${data.summary} ${tips[index]}`;
        }
        setTickerMessage(currentMsg);
      } catch (_) {
        if (mounted) setTickerMessage('Advisory service currently unavailable.');
      }
    };

    void loadTicker();
    triggerAttention();
    const interval = window.setInterval(() => {
      tick++;
      void loadTicker();
      triggerAttention();
    }, 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      if (attentionTimeout) window.clearTimeout(attentionTimeout);
    };
  }, []);

  // Construct context-aware AI chat nudge
  const refreshNudge = useCallback(async () => {
    try {
      const weather = await fetchCurrentWeather();
      const heatIndex = calculateHeatIndex(weather.temperature, weather.humidity);
      const level = getHeatLevel(heatIndex);
      const prompt = `Give a single-sentence heat advisory for a ${roleLabel}. Current temperature is ${weather.temperature.toFixed(1)}�C, heat index is ${heatIndex.toFixed(1)}�C (${level}). Condition: ${weather.conditions}. Keep it short and practical.`;

      const scoped = await generateScopedAdvisory(prompt, { lang: 'english', single: true });
      setNudgeText(scoped.singleResponse ?? scoped.summary);
    } catch (error) {
      setFallbackIndex((prev) => (prev + 1) % fallbackMessages.length);
      setNudgeText(fallbackMessages[(fallbackIndex + 1) % fallbackMessages.length]);
    }
  }, [fallbackIndex, roleLabel]);

  useEffect(() => {
    void refreshNudge();
    const interval = window.setInterval(() => void refreshNudge(), 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshNudge]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    const userMessage = { id: Date.now(), text: trimmed, sender: 'user' as const };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    setQuestion('');
    
    try {
      const lang = /[\u00C0-\u024F]|\b(ano|paano|bakit|kasi|lahat|naman|po|ngayon|mainit|init|mahirap|sino|saan)\b/i.test(trimmed)
        ? 'tagalog'
        : 'english';
      const scoped = await generateScopedAdvisory(trimmed, { lang, single: true });
      const actions = (scoped.actions ?? []).slice(0, 3).map((item) => `- ${item}`).join('\n');
      const tips = (scoped.safetyTips ?? []).slice(0, 3).map((item) => `- ${item}`).join('\n');
      const summary = scoped.singleResponse ?? scoped.summary;
      const replyParts = [
        summary,
        '',
        'Recommended steps:',
        actions || '- Keep hydrated and avoid peak heat exposure.',
        '',
        'Quick safety tips:',
        tips || '- Follow school advisories and monitor symptoms.',
        '',
        scoped.scopeNote,
      ].filter(part => typeof part === 'string');
      
      const aiMessage = { id: Date.now() + 1, text: replyParts.join('\n'), sender: 'ai' as const };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: 'The AI assistant is unavailable right now. Please refer to school guidelines.', sender: 'ai' as const }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="global-advisory-nudge">
      {isOpen ? (
        <div className="global-advisory-panel" role="dialog" aria-label="Smart Advisory Bot">
          <div className="global-advisory-panel-header">
            <div className="global-advisory-panel-title">
              <span className="global-advisory-header-icon">??</span>
              <div>
                <h3>Smart AI Advisory Bot</h3>
                <span className="global-advisory-status">
                  <span className="global-advisory-status-dot"></span>
                  Connected
                </span>
              </div>
            </div>
            <button className="global-advisory-close" onClick={() => setIsOpen(false)}>
              <MdClose />
            </button>
          </div>

          <div className="global-advisory-panel-body">
            <div className="global-advisory-messages">
              <div className="global-advisory-message ai">
                <div className="global-advisory-avatar">??</div>
                <div className="global-advisory-bubble">{nudgeText}</div>
              </div>
              {messages.map((message) => (
                <div key={message.id} className={`global-advisory-message ${message.sender}`}>
                  {message.sender === 'ai' && <div className="global-advisory-avatar">??</div>}
                  <div className="global-advisory-bubble">{message.text}</div>
                  {message.sender === 'user' && <div className="global-advisory-avatar user">??</div>}
                </div>
              ))}
              {isThinking && (
                <div className="global-advisory-message ai">
                  <div className="global-advisory-avatar">??</div>
                  <div className="global-advisory-bubble typing">AI is thinking...</div>
                </div>
              )}
            </div>

            <div className="global-advisory-input-row">
              <input
                type="text"
                placeholder="Ask about heat safety..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleAsk()}
              />
              <button onClick={() => void handleAsk()} disabled={!question.trim() || isThinking}>
                {isThinking ? '...' : 'Ask AI'}
              </button>
            </div>
            <button className="global-advisory-link" onClick={() => { setIsOpen(false); navigate(chatPath); }}>
              Open full dashboard view
            </button>
          </div>
        </div>
      ) : (
        <button
          className={`floating-advisory-header${isAttention ? ' attention' : ''}`}
          onClick={() => setIsOpen(true)}
          title="Open AI Chatbot"
        >
          <span className="floating-advisory-header-left">
            <span className="floating-advisory-badge">Advisory</span>
            <span className="floating-advisory-text">{tickerMessage}</span>
          </span>
          <span className="floating-advisory-icon">
            <MdChat />
          </span>
        </button>
      )}
    </div>
  );
};
