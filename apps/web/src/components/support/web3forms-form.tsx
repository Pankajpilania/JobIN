'use client';

import { useState, type FormEvent } from 'react';
import { LoaderCircle, Send } from 'lucide-react';

type Web3FormsFormProps = {
  type: 'contact' | 'support';
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '11px 13px',
  border: '1px solid var(--border)',
  borderRadius: 9,
  background: 'var(--surface)',
  color: 'var(--text)',
  font: 'inherit',
};

export function Web3FormsForm({ type }: Web3FormsFormProps) {
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  const isSupport = type === 'support';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessKey) {
      setStatus({
        kind: 'error',
        message: 'The message form is not configured yet. Please email 159ring@gmail.com.',
      });
      return;
    }

    setIsSending(true);
    setStatus(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('access_key', accessKey);
    formData.set('from_name', 'JobIN Website');
    formData.set(
      'subject',
      `${isSupport ? '[JobIN Support Ticket]' : '[JobIN Contact]'} ${String(formData.get('subject') ?? '')}`,
    );
    formData.set('replyto', String(formData.get('email') ?? ''));

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'The message could not be sent. Please try again.');
      }

      form.reset();
      setStatus({
        kind: 'success',
        message: isSupport
          ? 'Your support ticket was sent. We’ll reply to the email address you provided.'
          : 'Your message was sent. Thanks for getting in touch!',
      });
    } catch (submissionError) {
      setStatus({
        kind: 'error',
        message:
          submissionError instanceof Error
            ? submissionError.message
            : 'The message could not be sent. Please email 159ring@gmail.com.',
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
        }}
      >
        <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 14 }}>
          Your name
          <input name="name" autoComplete="name" maxLength={120} required style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 14 }}>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            style={inputStyle}
          />
        </label>
      </div>
      <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 14 }}>
        Subject
        <input
          name="subject"
          maxLength={160}
          required
          placeholder={isSupport ? 'What do you need help with?' : 'What is your message about?'}
          style={inputStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 14 }}>
        Message
        <textarea
          name="message"
          rows={5}
          maxLength={4000}
          required
          placeholder={
            isSupport ? 'Describe the issue and what you have tried.' : 'Write your message here.'
          }
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>
      <button
        type="submit"
        disabled={isSending}
        style={{
          display: 'inline-flex',
          width: 'fit-content',
          alignItems: 'center',
          gap: 8,
          padding: '11px 16px',
          border: 0,
          borderRadius: 9,
          background: 'var(--brand)',
          color: '#082318',
          fontWeight: 800,
          cursor: isSending ? 'wait' : 'pointer',
          opacity: isSending ? 0.7 : 1,
        }}
      >
        {isSending ? <LoaderCircle size={17} /> : <Send size={17} />}
        {isSending ? 'Sending…' : isSupport ? 'Send support ticket' : 'Send message'}
      </button>
      {status && (
        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          style={{
            margin: 0,
            color: status.kind === 'success' ? 'var(--brand-dark)' : 'var(--danger, #b42318)',
            lineHeight: 1.5,
          }}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}
