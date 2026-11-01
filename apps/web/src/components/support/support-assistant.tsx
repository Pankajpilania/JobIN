'use client';

import { useState, type FormEvent } from 'react';
import { Bot, LoaderCircle, Send } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Hi! I can help with general questions about using JobIN. What do you need help with?',
  },
];

export function SupportAssistant() {
  const [messages, setMessages] = useState(initialMessages);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: 'user' as const, content }].slice(-6);
    setMessages(nextMessages);
    setIsSending(true);
    setError('');

    try {
      const result = await apiClient.post<{ answer: string }>('/support/chat', {
        messages: nextMessages,
      });
      const reply: ChatMessage = { role: 'assistant', content: result.answer };
      setMessages([...nextMessages, reply].slice(-6));
      setQuestion('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The assistant could not respond. Please try again or submit a support ticket.',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      aria-labelledby="support-assistant-title"
      style={{
        padding: 'clamp(20px, 4vw, 30px)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        background: 'var(--surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brand-dark)' }}>
        <Bot size={23} />
        <h2 id="support-assistant-title" style={{ margin: 0, fontSize: 21 }}>
          AI support
        </h2>
      </div>
      <p style={{ margin: '9px 0 18px', color: 'var(--text-2)', lineHeight: 1.6 }}>
        Ask a general question about JobIN. For account-specific help, send a support ticket below.
      </p>
      <div
        aria-live="polite"
        style={{
          display: 'grid',
          gap: 10,
          maxHeight: 300,
          overflowY: 'auto',
          padding: 14,
          borderRadius: 12,
          background: 'var(--surface-2)',
        }}
      >
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            style={{
              justifySelf: message.role === 'user' ? 'end' : 'start',
              maxWidth: '90%',
              margin: 0,
              padding: '10px 13px',
              borderRadius: 12,
              background: message.role === 'user' ? 'var(--brand)' : 'var(--surface)',
              color: message.role === 'user' ? '#082318' : 'var(--text)',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </p>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 9, marginTop: 12 }}>
        <label
          htmlFor="support-question"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
          }}
        >
          Ask AI support
        </label>
        <input
          id="support-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={750}
          placeholder="Ask a question about JobIN…"
          disabled={isSending}
          style={{
            minWidth: 0,
            flex: 1,
            padding: '12px 14px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            background: 'var(--surface)',
            color: 'var(--text)',
          }}
        />
        <button
          type="submit"
          disabled={!question.trim() || isSending}
          aria-label="Send question"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '0 15px',
            border: 0,
            borderRadius: 10,
            background: 'var(--brand)',
            color: '#082318',
            fontWeight: 800,
            cursor: isSending ? 'wait' : 'pointer',
            opacity: !question.trim() || isSending ? 0.65 : 1,
          }}
        >
          {isSending ? <LoaderCircle size={17} /> : <Send size={17} />}
          <span className="support-submit-label">Send</span>
        </button>
      </form>
      {error && (
        <p
          role="alert"
          style={{ margin: '10px 0 0', color: 'var(--danger, #b42318)', fontSize: 14 }}
        >
          {error}
        </p>
      )}
      <p style={{ margin: '11px 0 0', color: 'var(--text-3)', fontSize: 12, lineHeight: 1.5 }}>
        Don’t share passwords, sign-in codes, or payment details.
      </p>
    </section>
  );
}
