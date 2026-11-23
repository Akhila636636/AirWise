import { useState, useRef, useEffect } from 'react';
import type {
  HouseholdProfile,
  AirQualitySummary,
  Language,
} from '@airwise/shared';
import { sendChatMessage } from '../utils/chatApi';
import styles from './AskAirWise.module.css';

interface AskAirWiseProps {
  profile: HouseholdProfile | null;
  airQuality: AirQualitySummary | null;
  planSummary?: string;
  language: Language;
}

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'llm' | 'rules';
}

const DEFAULT_CHIPS = [
  'Is it safe for my toddler to play outside today?',
  'What can I do about kitchen cooking smoke?',
  'Which mask is best for my commute: cloth or N95?',
  'Do house plants help clean indoor PM2.5 smog?',
];

export function AskAirWise({
  profile,
  airQuality,
  planSummary,
  language: _language,
}: AskAirWiseProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am your AirWise Assistant. Ask me any question about navigating today's smog, protecting vulnerable family members, or low-cost indoor hacks. (Note: I provide general air quality guidance, not medical advice).",
      source: 'rules',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState<string[]>(DEFAULT_CHIPS);
  const [isOpen, setIsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? input;
    if (!text.trim() || !profile || !airQuality || loading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const apiTurns = newHistory
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatMessage(
        apiTurns,
        profile,
        airQuality,
        planSummary,
      );

      const botMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        source: res.source,
      };

      setMessages((prev) => [...prev, botMsg]);
      if (res.suggestedQuestions && res.suggestedQuestions.length > 0) {
        setChips([...res.suggestedQuestions]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content:
            'I encountered a brief connection glitch. As a rule of thumb: during severe pollution (AQI > 150), prioritize sealing room gaps, running HEPA filtration, and avoiding morning outdoor exertion.',
          source: 'rules',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!profile || !airQuality) {
    return null;
  }

  return (
    <section className={`card ${styles.wrapper}`} aria-labelledby="chat-heading">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.onlineDot} aria-hidden="true" />
          <h3 id="chat-heading" className={styles.title}>
            💬 Ask AirWise Assistant
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`btn btn-secondary ${styles.toggleBtn}`}
          aria-expanded={isOpen}
          aria-controls="chat-drawer"
        >
          {isOpen ? 'Minimize Chat ▲' : 'Open Assistant ▼'}
        </button>
      </div>

      {isOpen && (
        <div id="chat-drawer" className={styles.chatDrawer}>
          <div
            className={styles.messageBox}
            role="log"
            aria-live="polite"
            aria-label="AirWise Assistant Chat History"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.messageBubble} ${
                  m.role === 'user' ? styles.userBubble : styles.assistantBubble
                }`}
              >
                <div className={styles.bubbleAuthor}>
                  {m.role === 'user' ? 'You' : '🌿 AirWise'}
                  {m.source && (
                    <span className={styles.sourceTag}>
                      ({m.source === 'llm' ? 'GenAI' : 'Rule Guardrail'})
                    </span>
                  )}
                </div>
                <div className={styles.bubbleText}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.messageBubble} ${styles.assistantBubble}`}>
                <div className={styles.bubbleAuthor}>🌿 AirWise</div>
                <div className={styles.bubbleText}>Consulting air data & plan...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Chips */}
          <div className={styles.chipsRow} aria-label="Suggested follow-up questions">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                disabled={loading}
                className={styles.chipBtn}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={styles.inputBar}
          >
            <label htmlFor="chat-input-field" className="sr-only">
              Ask AirWise a question
            </label>
            <input
              id="chat-input-field"
              type="text"
              maxLength={250}
              placeholder="Ask about outdoor play, masks, ventilation, cooking..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary"
              style={{ minHeight: '40px', padding: '0 1rem' }}
            >
              Send
            </button>
          </form>

          <p className={styles.medicalNotice}>
            Not medical advice. For persistent respiratory symptoms or medication guidance, consult a physician.
          </p>
        </div>
      )}
    </section>
  );
}
