import React, { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { generateScopedAdvisory } from '../../services/healthAdvisory.service';
import { MdOutlineChat, MdRefresh, MdSend, MdSmartToy } from 'react-icons/md';
import '../../styles/ParentPortalPages.css';

type Message = { id: number; sender: 'principal' | 'assistant'; text: string; meta?: string };

const prompts = [
  'Should we adjust outdoor activities across the school today?',
  'Draft a short heat advisory for teachers and parents.',
  'What should I document before deciding on a schedule change?',
];

const getLanguage = (text: string): 'english' | 'tagalog' | 'taglish' => {
  const normalized = text.toLowerCase();
  if (['ano', 'paano', 'dapat', 'pwede', 'init', 'tubig', 'klase'].some((hint) => normalized.includes(hint))) return 'tagalog';
  if (['what', 'how', 'should', 'school', 'heat', 'advisory'].some((hint) => normalized.includes(hint))) return 'english';
  return 'taglish';
};

const PrincipalChatbot: React.FC = () => {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'assistant', text: 'I am the principal heat-safety assistant. I can help with school-wide decisions, staff coordination, official notices, and escalation.', meta: 'Principal decision support' },
  ]);

  const scope = useMemo(() => ['School-wide controls', 'Staff coordination', 'Official notices', 'Escalation records'], []);

  const ask = async (value: string) => {
    const question = value.trim();
    if (!question || thinking) return;
    setMessages((current) => [...current, { id: Date.now(), sender: 'principal', text: question }]);
    setInput('');
    setThinking(true);
    try {
      const advisory = await generateScopedAdvisory(question, {
        single: true,
        lang: getLanguage(question),
        audienceRole: 'principal',
      });
      const reply = [
        advisory.singleResponse ?? advisory.summary,
        '',
        `Risk level: ${advisory.riskLevel}`,
        ...advisory.actions.slice(0, 3).map((action) => `• ${action}`),
        '',
        'Leadership follow-through:',
        '• Confirm the decision with the school heat policy and current weather data.',
        '• Notify teachers, parents, and the clinic when operations change.',
        '',
        advisory.scopeNote,
      ].join('\n');
      setMessages((current) => [...current, { id: Date.now() + 1, sender: 'assistant', text: reply, meta: 'Generated from trained heat-risk context + principal role guidance' }]);
    } catch (error) {
      console.error('Principal chatbot request failed:', error);
      setMessages((current) => [...current, { id: Date.now() + 1, sender: 'assistant', text: 'The advisory service is unavailable. Review the current heat index, school policy, and latest incident reports before changing operations.', meta: 'Fallback response' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="parent-chatbot-page">
      <div className="parent-chatbot-hero">
        <div>
          <p className="parent-portal-eyebrow">Principal panel</p>
          <h1>School Safety Assistant</h1>
          <p>Use the assistant for school-wide heat decisions, staff coordination, and official communication drafts.</p>
        </div>
        <div className="parent-chatbot-scope-card">
          <MdSmartToy className="parent-chatbot-scope-icon" />
          <div><strong>Leadership response mode</strong><p>Risk-aware guidance with clear operational follow-through.</p></div>
        </div>
      </div>

      <div className="parent-chatbot-layout">
        <Card className="parent-chatbot-main" noPadding>
          <div className="parent-chatbot-header">
            <div><h2>Leadership conversation</h2><p>Ask for decisions, notices, coordination steps, or incident follow-up.</p></div>
            <Button variant="outline" size="small" icon={<MdRefresh />} onClick={() => setMessages((current) => current.slice(0, 1))}>Reset Chat</Button>
          </div>
          <div className="parent-chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`parent-chatbot-message ${message.sender === 'assistant' ? 'assistant' : 'parent'}`}>
                <div className="parent-chatbot-avatar">{message.sender === 'assistant' ? <MdSmartToy /> : <MdOutlineChat />}</div>
                <div className="parent-chatbot-bubble">{message.meta && <span className="parent-chatbot-meta">{message.meta}</span>}<p style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p></div>
              </div>
            ))}
            {thinking && <div className="parent-chatbot-message assistant"><div className="parent-chatbot-avatar"><MdSmartToy /></div><div className="parent-chatbot-bubble parent-chatbot-typing">Reviewing heat and school context...</div></div>}
          </div>
          <div className="parent-chatbot-prompts">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)}>{prompt}</button>)}</div>
          <div className="parent-chatbot-input-row">
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void ask(input); }} placeholder="Ask about a school-wide heat decision..." />
            <Button variant="primary" icon={<MdSend />} onClick={() => void ask(input)} disabled={!input.trim() || thinking}>Send</Button>
          </div>
        </Card>
        <div className="parent-chatbot-side">
          <Card title="Principal scope" className="parent-chatbot-side-card"><div className="parent-chatbot-pill-list">{scope.map((item) => <span key={item} className="parent-chatbot-pill">{item}</span>)}</div></Card>
          <Card title="Decision lens" className="parent-chatbot-side-card"><ul className="parent-chatbot-list"><li>Use the trained heat-risk result as the current risk signal.</li><li>Confirm actions against school policy and local authority guidance.</li><li>Document decisions and communicate changes clearly.</li></ul></Card>
        </div>
      </div>
    </div>
  );
};

export default PrincipalChatbot;
