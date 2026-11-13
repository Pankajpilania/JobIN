'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { sendNotification } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bell, CheckCircle2, Send } from 'lucide-react';

const fieldStyle = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text-1)',
  padding: '12px 14px',
  font: 'inherit',
} as const;

export default function AdminNotificationsPage() {
  const { getToken } = useAuth();
  const [audience, setAudience] = useState<'ALL' | 'PREMIUM' | 'CHURNED'>('ALL');
  const [type, setType] = useState<'EMAIL' | 'IN_APP'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; subject: string } | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedContent = content.trim();
    if (!trimmedSubject || !trimmedContent) {
      toast.error('Add a subject and message first.');
      return;
    }

    const audienceLabel =
      audience === 'ALL' ? 'all active users' : `${audience.toLowerCase()} users`;
    const deliveryLabel = type === 'EMAIL' ? 'send an email to' : 'create an in-app update for';
    if (
      !window.confirm(
        `This will ${deliveryLabel} ${audienceLabel}. Recipients are selected when you send, and email cannot be recalled. Continue?`,
      )
    ) {
      return;
    }

    setSending(true);
    setLastResult(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your admin session has expired. Sign in again.');
      const result = await sendNotification(token, {
        audience,
        type,
        subject: trimmedSubject,
        content: trimmedContent,
      });
      setLastResult(result);
      toast.success(`${result.sent} users selected for this notification.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--surface-2)',
              color: 'var(--brand)',
            }}
          >
            <Bell size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--text-1)' }}>
              Notifications
            </h1>
            <p style={{ margin: '5px 0 0', color: 'var(--text-3)' }}>
              Send announcements, product updates, and offers to a chosen audience.
            </p>
          </div>
        </div>
      </header>

      <Card hoverEffect={false} style={{ padding: 24 }}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label
              htmlFor="notification-audience"
              style={{ fontWeight: 700, color: 'var(--text-1)' }}
            >
              Audience
            </label>
            <select
              id="notification-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as typeof audience)}
              style={fieldStyle}
            >
              <option value="ALL">All active users</option>
              <option value="PREMIUM">Paid subscribers</option>
              <option value="CHURNED">Former subscribers</option>
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Suspended and deleted accounts are excluded from audience sends.
            </span>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="notification-type" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
              Delivery
            </label>
            <select
              id="notification-type"
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              style={fieldStyle}
            >
              <option value="EMAIL">Email</option>
              <option value="IN_APP">In-app notification</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label
              htmlFor="notification-subject"
              style={{ fontWeight: 700, color: 'var(--text-1)' }}
            >
              Subject
            </label>
            <input
              id="notification-subject"
              required
              maxLength={160}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="A short, clear heading"
              style={fieldStyle}
            />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label
              htmlFor="notification-content"
              style={{ fontWeight: 700, color: 'var(--text-1)' }}
            >
              Message
            </label>
            <textarea
              id="notification-content"
              required
              maxLength={5000}
              rows={8}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the announcement or offer details…"
              style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)' }}>
              {content.length}/5000
            </span>
          </div>

          {lastResult && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 10,
                background: 'var(--surface-2)',
                color: 'var(--text-1)',
              }}
            >
              <CheckCircle2 size={18} color="#16865b" aria-hidden="true" />
              {lastResult.sent} users selected · {lastResult.subject}
            </div>
          )}

          <div>
            <Button type="submit" disabled={sending}>
              <Send size={16} aria-hidden="true" />
              {sending ? 'Sending…' : type === 'EMAIL' ? 'Send email' : 'Publish in-app update'}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
