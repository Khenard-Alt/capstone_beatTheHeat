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
  'Ano ang dapat gawin ng anak ko ngayong sobrang init?',
  'Pwede pa bang mag-outdoor activity ang mga estudyante ngayong hapon?',
  'Anong signs ng heat exhaustion ang dapat bantayan?',
  'Ipaliwanag mo ang advisory nang simple.',
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

export const ParentChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
        text: 'Ako ang Beat The Heat parent assistant. Maaari kang magtanong tungkol sa heat advisories, school safety, o kung ano ang dapat gawin ng anak mo.',
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
      const scoped = await generateScopedAdvisory(trimmed, { single: true, lang: inferLanguageFromQuery(trimmed) });
      const summary = scoped.singleResponse ?? scoped.summary;
      const reply = [
        summary,
        '',
        `Antas ng panganib: ${scoped.riskLevel}`,
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
          text: 'Hindi available ang advisory service ngayon. Paki-check ang latest school heat level at sundin ang current safety notice.',
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
            <p>Sumasagot lang sa heat-related school safety questions at umiiwas sa off-topic na gabay.</p>
          </div>
        </div>
      </div>

      <div className="parent-chatbot-layout">
        <Card className="parent-chatbot-main" noPadding>
          <div className="parent-chatbot-header">
            <div>
              <h2>Usapan</h2>
              <p>Panatilihing maikli ang tanong. Magbibigay ang assistant ng scoped na sagot at next steps.</p>
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
                  <span>Iniisip ang current heat context...</span>
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
              <li>Gumamit ng Tagalog, English, o Taglish.</li>
              <li>Magtanong ng specific child-safety action o paliwanag.</li>
              <li>Sundan ang advisory page kapag kailangan mo ng formal risk summary.</li>
            </ul>
          </Card>

          <Card title="Fast access" className="parent-chatbot-side-card">
              <p className="parent-chatbot-side-copy">
              Buksan ang advisory page para sa structured safety summary, o bumalik sa dashboard para makita ang live school heat status.
            </p>
            <Button variant="outline" fullWidth icon={<MdOpenInNew />}>
              Buksan ang Advisory
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};