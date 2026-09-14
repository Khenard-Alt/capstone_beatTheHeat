import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdChat, MdClose, MdInfoOutline } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { fetchCurrentWeather } from '../services/weather.service';
import { generateScopedAdvisory, fetchRealtimeAdvisory } from '../services/healthAdvisory.service';
import { calculateHeatIndex, getHeatLevel } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import '../styles/SmartAdvisoryBot.css';

const fallbackMessages = [
  'Tanungin mo ako tungkol sa heat index, student safety, at parent precautions.',
  'Kailangan mo ng heat safety tips? Tanungin mo ako tungkol sa school advisories.',
  'Nagbabago ang heat index. Humingi ka ng mabilis na gabay ngayon.',
  'Tanungin mo ako tungkol sa heat level ngayon at mga recommended action.',
];

const inferLanguageFromQuery = (text: string): 'english' | 'tagalog' | 'taglish' => {
  const normalized = text.toLowerCase();

  const tagalogHints = ['ano', 'paano', 'bakit', 'kasi', 'dapat', 'pwede', 'ba', 'po', 'opo', 'yung', 'naman', 'huwag', 'delikado', 'init', 'tubig', 'klase'];
  if (tagalogHints.some((token) => normalized.includes(token))) {
    return 'tagalog';
  }

  const englishHints = ['english', 'what', 'why', 'how', 'should', 'can', 'please', 'safe', 'heat', 'school', 'advisory', 'recess'];
  if (englishHints.some((token) => normalized.includes(token))) {
    return 'english';
  }

  return 'taglish';
};

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
  const [showScopeNotice, setShowScopeNotice] = useState(false);

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
      const prompt = `Bigyan ako ng isang maikling heat advisory para sa isang ${roleLabel}. Ang current temperature ay ${weather.temperature.toFixed(1)}�C, heat index ay ${heatIndex.toFixed(1)}�C (${level}). Condition: ${weather.conditions}. Gawing maikli at praktikal.`;

      const scoped = await generateScopedAdvisory(prompt, { single: true, audienceRole: user?.role === 'teacher' || user?.role === 'principal' || user?.role === 'head-teacher' || user?.role === 'parent' || user?.role === 'admin' ? user.role : undefined });
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

  // Lets other parts of the app (e.g. the parent dashboard's heat alert
  // popup) open this single, real bot instead of building a second chat UI.
  useEffect(() => {
    const openBot = () => setIsOpen(true);
    window.addEventListener('bth:open-advisory-bot', openBot);
    return () => window.removeEventListener('bth:open-advisory-bot', openBot);
  }, []);

  // Show the scope disclaimer automatically the first time this browser
  // opens the chat, so people know upfront it only answers heat-safety
  // questions — not general chit-chat. The (?) button lets them bring it
  // back up any time after that.
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (!localStorage.getItem('bth_advisory_scope_seen')) {
        setShowScopeNotice(true);
        localStorage.setItem('bth_advisory_scope_seen', '1');
      }
    } catch {
      setShowScopeNotice(true);
    }
  }, [isOpen]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    const userMessage = { id: Date.now(), text: trimmed, sender: 'user' as const };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    setQuestion('');
    
    try {
      const scoped = await generateScopedAdvisory(trimmed, { single: true, lang: inferLanguageFromQuery(trimmed), audienceRole: user?.role === 'teacher' || user?.role === 'principal' || user?.role === 'head-teacher' || user?.role === 'parent' || user?.role === 'admin' ? user.role : undefined });
      const actions = (scoped.actions ?? []).slice(0, 3).map((item) => `- ${item}`).join('\n');
      const tips = (scoped.safetyTips ?? []).slice(0, 3).map((item) => `- ${item}`).join('\n');
      const summary = scoped.singleResponse ?? scoped.summary;
      const replyParts = [
        summary,
        '',
        'Mga recommended na hakbang:',
        actions || '- Uminom ng tubig at iwasan ang matinding init.',
        '',
        'Mabilis na safety tips:',
        tips || '- Sundin ang school advisories at bantayan ang sintomas.',
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
              <span className="global-advisory-header-icon">AI</span>
              <div>
                <h3>Smart AI Advisory Bot</h3>
                <span className="global-advisory-status">
                  <span className="global-advisory-status-dot"></span>
                  Connected
                </span>
              </div>
            </div>
            <div className="global-advisory-header-actions">
              <button
                className="global-advisory-scope-btn"
                onClick={() => setShowScopeNotice(true)}
                title="What can I ask this AI?"
                aria-label="What can I ask this AI?"
              >
                <MdInfoOutline />
              </button>
              <button className="global-advisory-close" onClick={() => setIsOpen(false)}>
                <MdClose />
              </button>
            </div>
          </div>

          {showScopeNotice && (
            <div className="global-advisory-scope-overlay" role="dialog" aria-label="AI scope notice">
              <div className="global-advisory-scope-card">
                <h4>Ano ang pwedeng itanong?</h4>
                <p>
                  Ang Smart AI Advisory Bot ay para lang sa <strong>heat index, weather, at school heat-safety
                  advisories</strong> — hal. current heat level, kung ligtas ba ang outdoor activities, mga
                  precaution para sa mag-aaral, at heat-related na tanong tungkol sa paaralan.
                </p>
                <p>
                  Hindi ito sasagot sa mga tanong na wala sa saklaw nito (general chit-chat, ibang paksa, atbp.) —
                  heat-safety at ang platform na ito lang ang tinatalakay nito.
                </p>
                <button className="global-advisory-scope-ok" onClick={() => setShowScopeNotice(false)}>
                  Got it
                </button>
              </div>
            </div>
          )}

          <div className="global-advisory-panel-body">
            <div className="global-advisory-messages">
              <div className="global-advisory-message ai">
                <div className="global-advisory-avatar">AI</div>
                <div className="global-advisory-bubble">{nudgeText}</div>
              </div>
              {messages.map((message) => (
                <div key={message.id} className={`global-advisory-message ${message.sender}`}>
                  {message.sender === 'ai' && <div className="global-advisory-avatar">AI</div>}
                  <div className="global-advisory-bubble">{message.text}</div>
                  {message.sender === 'user' && <div className="global-advisory-avatar user">You</div>}
                </div>
              ))}
              {isThinking && (
                <div className="global-advisory-message ai">
                  <div className="global-advisory-avatar">AI</div>
                  <div className="global-advisory-bubble typing">Nag-iisip ang AI...</div>
                </div>
              )}
            </div>

            <div className="global-advisory-input-row">
              <input
                type="text"
                placeholder="Magtanong tungkol sa heat safety..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleAsk()}
              />
              <button onClick={() => void handleAsk()} disabled={!question.trim() || isThinking}>
                {isThinking ? '...' : 'Tanungin ang AI'}
              </button>
            </div>

            <button
              className="global-advisory-link"
              onClick={() => {
                setIsOpen(false);
                navigate(chatPath);
              }}
            >
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
