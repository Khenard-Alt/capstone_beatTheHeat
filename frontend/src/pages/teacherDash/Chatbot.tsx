import React, { useMemo, useState } from 'react';
import { MdAutoAwesome, MdOutlineChat, MdSend, MdSmartToy } from 'react-icons/md';
import { Card } from '../../components/Card';
import { generateScopedAdvisory } from '../../services/healthAdvisory.service';
import '../../styles/TeacherPanel.css';

type ChatRole = 'teacher' | 'assistant';

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  meta?: string;
}

const starterPrompts = [
  'Pwede pa ba ang PE ngayong danger level heat?',
  'Gumawa ka ng short advisory para sa klase ko.',
  'Ano ang dapat i-report kapag may nahihilo na estudyante?',
  'Paano ko sasabihin sa parents ang heat safety reminder?',
];

const inferLanguageFromQuery = (text: string): 'english' | 'tagalog' | 'taglish' => {
  const normalized = text.toLowerCase();
  const tagalogHints = ['ano', 'paano', 'bakit', 'kasi', 'dapat', 'pwede', 'ba', 'po', 'opo', 'yung', 'naman', 'huwag', 'delikado', 'init', 'tubig', 'klase'];
  if (tagalogHints.some((token) => normalized.includes(token))) return 'tagalog';
  const englishHints = ['what', 'why', 'how', 'should', 'can', 'please', 'safe', 'heat', 'school', 'advisory', 'recess'];
  if (englishHints.some((token) => normalized.includes(token))) return 'english';
  return 'taglish';
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Ako ang teacher heat advisor. Tanungin mo ako tungkol sa class safety, incident reporting, at school heat guidance.',
      meta: 'System scoped to teacher heat safety',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const scopePills = useMemo(() => ([
    'Class safety',
    'Conduct forms',
    'Incident reports',
    'Parent reminders',
  ]), []);

  const askAssistant = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: 'teacher', text: trimmed }]);
    setInput('');
    setIsThinking(true);

    try {
      const scoped = await generateScopedAdvisory(trimmed, { single: true, lang: inferLanguageFromQuery(trimmed) });
      const reply = [
        scoped.singleResponse ?? scoped.summary,
        '',
        `Risk level: ${scoped.riskLevel}`,
        ...scoped.actions.slice(0, 3).map((item) => `• ${item}`),
        '',
        ...scoped.safetyTips.slice(0, 3).map((item) => `• ${item}`),
        '',
        scoped.scopeNote,
      ].join('\n');

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply, meta: 'Generated from current heat context' }]);
    } catch (error) {
      console.error('Teacher chatbot request failed:', error);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: 'Hindi available ang advisory ngayon. Sundin muna ang latest school heat guidance.', meta: 'Fallback response' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="teacher-page-shell">
      <div className="teacher-hero">
        <div>
          <p className="teacher-eyebrow">Teacher panel</p>
          <h1>Chatbot</h1>
          <p>Ask short questions about heat-related class decisions and get a scoped advisory for the school day.</p>
        </div>
        <div className="teacher-hero-card">
          <MdSmartToy className="teacher-hero-icon" />
          <div>
            <strong>Teacher assistant</strong>
            <p>Fast answers for classroom safety, advisories, and report wording.</p>
          </div>
        </div>
      </div>

      <div className="teacher-chatbot-shell">
        <Card className="teacher-chatboard teacher-panel-card" noPadding>
          <div className="teacher-chat-header">
            <div>
              <h2>Usapan</h2>
              <p>Gumamit ng Tagalog, English, o Taglish. Magbibigay ang assistant ng practical response at next steps.</p>
            </div>
          </div>

          <div className="teacher-chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`teacher-chat-message ${message.role}`}>
                <div className="teacher-chat-avatar">
                  {message.role === 'assistant' ? <MdSmartToy /> : <MdOutlineChat />}
                </div>
                <div className="teacher-chat-bubble">
                  {message.meta && <span className="teacher-chat-meta">{message.meta}</span>}
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.text}</p>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="teacher-chat-message assistant">
                <div className="teacher-chat-avatar"><MdSmartToy /></div>
                <div className="teacher-chat-bubble">
                  <span className="teacher-chat-meta">Thinking</span>
                  <p style={{ margin: 0 }}>Iniisip ang current heat context...</p>
                </div>
              </div>
            )}
          </div>

          <div className="teacher-chat-prompts">
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void askAssistant(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="teacher-chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void askAssistant(input);
                }
              }}
              placeholder="Magtanong tungkol sa class safety..."
            />
            <button type="button" className="btn btn-primary" onClick={() => void askAssistant(input)} disabled={!input.trim() || isThinking}>
              <MdSend /> Tanungin ang AI
            </button>
          </div>
        </Card>

        <div className="teacher-side-stack">
          <Card title="Scope" className="teacher-panel-card">
            <div className="teacher-pill-list">
              {scopePills.map((pill) => (
                <span key={pill} className="teacher-pill accent">{pill}</span>
              ))}
            </div>
          </Card>

          <Card title="Best prompts" className="teacher-panel-card">
            <ul className="teacher-list">
              <li>Ask for a one-line advisory for today’s class.</li>
              <li>Ask how to word a parent reminder.</li>
              <li>Ask what to do for symptoms like dizziness or nausea.</li>
            </ul>
          </Card>

          <Card title="Quick hint" className="teacher-panel-card tone-alert">
            <div className="teacher-sidebar-note">
              If the heat is danger-level, prioritize hydration, indoor activity, and a quick report before the situation escalates.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;