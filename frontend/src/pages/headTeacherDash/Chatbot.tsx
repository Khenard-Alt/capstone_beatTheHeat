import React, { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MdSend, MdSmartToy, MdOutlineChat, MdRefresh, MdOpenInNew } from 'react-icons/md';
import { generateScopedAdvisory } from '../../services/healthAdvisory.service';
import '../../styles/ParentPortalPages.css';

type ChatRole = 'head-teacher' | 'assistant';

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  meta?: string;
}

const starterPrompts = [
  'What should we do if a student feels dizzy during class?',
  'Summarize the current heat advisory for teachers and parents.',
  'What should I tell the principal about repeated heat incidents?',
];

const inferLanguageFromQuery = (text: string): 'english' | 'tagalog' | 'taglish' => {
  const normalized = text.toLowerCase();
  const tagalogHints = ['ano', 'paano', 'bakit', 'kasi', 'dapat', 'pwede', 'ba', 'po', 'opo', 'yung', 'naman', 'huwag', 'delikado', 'init', 'tubig', 'klase'];
  if (tagalogHints.some((token) => normalized.includes(token))) return 'tagalog';
  const englishHints = ['english', 'what', 'why', 'how', 'should', 'can', 'please', 'safe', 'heat', 'school', 'advisory', 'recess'];
  if (englishHints.some((token) => normalized.includes(token))) return 'english';
  return 'taglish';
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'assistant', text: 'Ask about heat incidents, class safety, advisories, or next actions.', meta: 'AI scoped for head teacher use' },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const scopePills = useMemo(() => ([
    'Incident triage',
    'Teacher guidance',
    'Parent messaging',
  ]), []);

  const appendAssistantReply = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: 'head-teacher', text: trimmed }]);
    setInput('');
    setIsThinking(true);

    try {
      const scoped = await generateScopedAdvisory(trimmed, { single: true, lang: inferLanguageFromQuery(trimmed) });
      const summary = scoped.singleResponse ?? scoped.summary;
      const reply = [summary, '', `Risk level: ${scoped.riskLevel}`, ...scoped.actions.slice(0, 3).map((a) => `• ${a}`), '', scoped.scopeNote].join('\n');

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply, meta: 'Generated from live heat context' }]);
    } catch (error) {
      console.error('Head teacher chatbot advisory request failed:', error);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: 'Advisory service unavailable. Check latest heat advisory and incident log.', meta: 'Fallback response' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="parent-chatbot-page">
      <div className="parent-chatbot-hero">
        <div>
          <p className="parent-portal-eyebrow">Head teacher panel</p>
          <h1>Chatbot</h1>
          <p>Use the assistant to draft incident responses, heat guidance, and short messages for staff or parents.</p>
        </div>

        <div className="parent-chatbot-scope-card">
          <MdSmartToy className="parent-chatbot-scope-icon" />
          <div>
            <strong>Scoped response mode</strong>
            <p>Quick assistant focused on incident triage and school safety messaging.</p>
          </div>
        </div>
      </div>

      <div className="parent-chatbot-layout">
        <Card className="parent-chatbot-main" noPadding>
          <div className="parent-chatbot-header">
            <div>
              <h2>Conversation</h2>
              <p>Keep questions short. The assistant returns scoped guidance and next steps.</p>
            </div>
            <div className="admin-dashboard-badges">
              <Button variant="outline" size="small" icon={<MdRefresh />} onClick={() => setMessages((prev) => prev.slice(0, 1))}>
                Reset Chat
              </Button>
            </div>
          </div>

          <div className="parent-chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`parent-chatbot-message ${message.role === 'assistant' ? 'assistant' : 'parent'}`}>
                <div className="parent-chatbot-avatar">{message.role === 'assistant' ? <MdSmartToy /> : <MdOutlineChat />}</div>
                <div className="parent-chatbot-bubble">
                  {message.meta && <span className="parent-chatbot-meta">{message.meta}</span>}
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="parent-chatbot-message assistant">
                <div className="parent-chatbot-avatar"><MdSmartToy /></div>
                <div className="parent-chatbot-bubble parent-chatbot-typing"><span>Thinking...</span></div>
              </div>
            )}
          </div>

          <div className="parent-chatbot-prompts">
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void appendAssistantReply(prompt)}>{prompt}</button>
            ))}
          </div>

          <div className="parent-chatbot-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void appendAssistantReply(input); }}
              placeholder="Ask about incident actions, advisories, class safety, or parent messaging..."
            />
            <Button variant="primary" icon={<MdSend />} onClick={() => void appendAssistantReply(input)} disabled={!input.trim() || isThinking}>Send</Button>
          </div>
        </Card>

        <div className="parent-chatbot-side">
          <Card title="Scope" className="parent-chatbot-side-card">
            <div className="parent-chatbot-pill-list">
              {scopePills.map((pill) => (<span key={pill} className="parent-chatbot-pill">{pill}</span>))}
            </div>
          </Card>

          <Card title="How to ask" className="parent-chatbot-side-card">
            <ul className="parent-chatbot-list">
              <li>Use English, Tagalog, or Taglish.</li>
              <li>Ask specific incident or student-safety actions.</li>
              <li>Refer to the advisory page for formal risk summaries.</li>
            </ul>
          </Card>

          <Card title="Fast access" className="parent-chatbot-side-card">
            <p className="parent-chatbot-side-copy">Open the advisory page for structured safety summaries or return to the dashboard for live heat status.</p>
            <Button variant="outline" fullWidth icon={<MdOpenInNew />}>Open Advisory</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
