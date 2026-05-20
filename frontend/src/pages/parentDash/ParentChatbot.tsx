import React, { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { generateScopedAdvisory } from '../../services/healthAdvisory.service';
import { MdSend, MdSmartToy, MdOutlineChat, MdRefresh, MdOpenInNew } from 'react-icons/md';
import '../../styles/ParentPortalPages.css';

type ChatRole = 'parent' | 'assistant';

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  meta?: string;
}

const starterPrompts = [
  'What should my child do during extreme heat today?',
  'Can students still do outdoor activities this afternoon?',
  'What signs of heat exhaustion should I watch for?',
  'Explain the advisory in simple terms.',
];

export const ParentChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'I am the Beat The Heat parent assistant. Ask me about heat advisories, school safety, or what your child should do next.',
      meta: 'System scoped to school heat safety',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const scopePills = useMemo(() => ([
    'Heat advisories',
    'Parent precautions',
    'Class activity safety',
    'Child warning signs',
  ]), []);

  const appendAssistantReply = async (question: string) => {
    const trimmed = question.trim();

    if (!trimmed || isThinking) {
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now(), role: 'parent', text: trimmed }]);
    setInput('');
    setIsThinking(true);

    try {
      const lang = /[\u00C0-\u024F]|\b(ano|paano|bakit|kasi|lahat|naman|po|ngayon|mainit|init|mahirap|sino|saan)\b/i.test(trimmed)
        ? 'tagalog'
        : 'english';

      const scoped = await generateScopedAdvisory(trimmed, { lang, single: true });
      const summary = scoped.singleResponse ?? scoped.summary;
      const reply = [
        summary,
        '',
        `Risk level: ${scoped.riskLevel}`,
        ...scoped.actions.slice(0, 3).map((action) => `• ${action}`),
        '',
        scoped.scopeNote,
      ].join('\n');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: reply,
          meta: 'Generated from live heat and humidity context',
        },
      ]);
    } catch (error) {
      console.error('Parent chatbot advisory request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: 'The advisory service is unavailable right now. Please check the latest school heat level and follow the current safety notice.',
          meta: 'Fallback response',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="parent-chatbot-page">
      <div className="parent-chatbot-hero">
        <div>
          <p className="parent-portal-eyebrow">ChatGPT-style messaging area</p>
          <h1>Parent Chatbot</h1>
          <p>
            Ask plain-language questions about the project scope. The assistant stays focused on school heat safety,
            advisories, and parent actions.
          </p>
        </div>
        <div className="parent-chatbot-scope-card">
          <MdSmartToy className="parent-chatbot-scope-icon" />
          <div>
            <strong>Scoped response mode</strong>
            <p>Only answers heat-related school safety questions and avoids off-topic guidance.</p>
          </div>
        </div>
      </div>

      <div className="parent-chatbot-layout">
        <Card className="parent-chatbot-main" noPadding>
          <div className="parent-chatbot-header">
            <div>
              <h2>Conversation</h2>
              <p>Keep questions short. The assistant will respond with a scoped answer and next steps.</p>
            </div>
            <Button
              variant="outline"
              size="small"
              icon={<MdRefresh />}
              onClick={() => setMessages((prev) => prev.slice(0, 1))}
            >
              Reset Chat
            </Button>
          </div>

          <div className="parent-chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`parent-chatbot-message ${message.role}`}>
                <div className="parent-chatbot-avatar">
                  {message.role === 'assistant' ? <MdSmartToy /> : <MdOutlineChat />}
                </div>
                <div className="parent-chatbot-bubble">
                  {message.meta && <span className="parent-chatbot-meta">{message.meta}</span>}
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="parent-chatbot-message assistant">
                <div className="parent-chatbot-avatar">
                  <MdSmartToy />
                </div>
                <div className="parent-chatbot-bubble parent-chatbot-typing">
                  <span>Thinking about the current heat context...</span>
                </div>
              </div>
            )}
          </div>

          <div className="parent-chatbot-prompts">
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void appendAssistantReply(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="parent-chatbot-input-row">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void appendAssistantReply(input);
                }
              }}
              placeholder="Ask about today’s heat advisory..."
            />
            <Button
              variant="primary"
              icon={<MdSend />}
              onClick={() => void appendAssistantReply(input)}
              disabled={!input.trim() || isThinking}
            >
              Send
            </Button>
          </div>
        </Card>

        <div className="parent-chatbot-side">
          <Card title="Scope" className="parent-chatbot-side-card">
            <div className="parent-chatbot-pill-list">
              {scopePills.map((pill) => (
                <span key={pill} className="parent-chatbot-pill">{pill}</span>
              ))}
            </div>
          </Card>

          <Card title="How to ask" className="parent-chatbot-side-card">
            <ul className="parent-chatbot-list">
              <li>Use English, Tagalog, or Taglish.</li>
              <li>Ask for a specific child-safety action or explanation.</li>
              <li>Follow up with the advisory page when you need the formal risk summary.</li>
            </ul>
          </Card>

          <Card title="Fast access" className="parent-chatbot-side-card">
            <p className="parent-chatbot-side-copy">
              Open the advisory page for a structured safety summary, or return to the dashboard to view live school heat status.
            </p>
            <Button variant="outline" fullWidth icon={<MdOpenInNew />}>
              Open Advisory
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};