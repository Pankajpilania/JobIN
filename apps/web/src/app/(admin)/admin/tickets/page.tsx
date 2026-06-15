'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { listTickets, updateTicket, replyToTicket, sendNotification } from '@/lib/admin-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, ChevronDown } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  OPEN:                     '#3B82F6',
  IN_PROGRESS:              '#F59E0B',
  WAITING_ON_USER:          '#818CF8',
  WAITING_ON_INTERNAL_TEAM: '#F97316',
  RESOLVED:                 '#10B981',
  CLOSED:                   'var(--text-3)',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    'var(--text-3)',
  MEDIUM: '#F59E0B',
  HIGH:   '#F97316',
  URGENT: '#EF4444',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'var(--text-3)';
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 999, fontSize: 10,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      background: `${color}20`, color, border: `1px solid ${color}40`,
    }}>{status.replace(/_/g, ' ')}</span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: PRIORITY_COLORS[priority] ?? 'var(--text-3)',
      display: 'inline-block', marginRight: 5,
    }} />
  );
}

// ─── Ticket detail panel ──────────────────────────────────────────────────────

function TicketPanel({
  ticket, token, onClose, onUpdate,
}: { ticket: any; token: string; onClose: () => void; onUpdate: () => void }) {
  const [reply,    setReply]    = useState('');
  const [status,   setStatus]   = useState(ticket.status);
  const [sending,  setSending]  = useState(false);
  const [updating, setUpdating] = useState(false);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await replyToTicket(token, ticket.id, reply);
    setReply('');
    setSending(false);
    onUpdate();
  };

  const update = async () => {
    setUpdating(true);
    await updateTicket(token, ticket.id, { status });
    setUpdating(false);
    onUpdate();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '16px'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyText: 'space-between', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
              {ticket.subject}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={ticket.status} />
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                <PriorityDot priority={ticket.priority} />{ticket.priority}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                {ticket.user?.email}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        {/* Description */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontWeight: 500 }}>{ticket.description}</div>
        </div>

        {/* Update status */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <select
              value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '8px 36px 8px 12px', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              {Object.keys(STATUS_COLORS).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '14px', width: '14px', color: 'var(--text-3)' }} />
          </div>
          <button
            onClick={update} disabled={updating || status === ticket.status}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand-light)', color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (updating || status === ticket.status) ? 0.5 : 1, transition: 'var(--transition)' }}
          >
            {updating ? 'Updating…' : 'Update Status'}
          </button>
        </div>

        {/* Reply box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Admin Reply (sends email to user)</label>
          <textarea
            value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Write your reply…"
            style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, resize: 'vertical', minHeight: 90, outline: 'none', boxSizing: 'border-box', fontWeight: 500 }}
          />
          <button
            onClick={send} disabled={sending || !reply.trim()}
            style={{
              marginTop: 6, padding: '10px 20px', borderRadius: 8, border: 'none',
              background: 'var(--brand)', color: 'white',
              fontSize: 13, fontWeight: 600, cursor: (sending || !reply.trim()) ? 'not-allowed' : 'pointer',
              opacity: (sending || !reply.trim()) ? 0.5 : 1, alignSelf: 'flex-start', transition: 'var(--transition)'
            }}
          >
            {sending ? 'Sending…' : 'Send Reply ✉️'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification modal ───────────────────────────────────────────────────────

function NotifyModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [subject,  setSubject]  = useState('');
  const [content,  setContent]  = useState('');
  const [audience, setAudience] = useState('ACTIVE');
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState('');

  const send = async () => {
    if (!subject || !content) return;
    setSending(true);
    try {
      const r = await sendNotification(token, { audience, subject, content, type: 'EMAIL' });
      setResult(`✓ Sent to ${r.sent} users`);
    } catch (e: any) {
      setResult(`⚠️ ${e.message}`);
    }
    setSending(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '20px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyText: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>📢 Send Email Campaign</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audience</label>
            <div style={{ position: 'relative' }}>
              <select value={audience} onChange={e => setAudience(e.target.value)}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '10px 36px 10px 12px', fontSize: 13, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                <option value="ALL">All Users</option>
                <option value="ACTIVE">Active Users</option>
                <option value="PREMIUM">Premium Subscribers</option>
                <option value="CHURNED">Churned Users</option>
              </select>
              <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '14px', width: '14px', color: 'var(--text-3)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…"
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontWeight: 500 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Email content…"
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', padding: '10px 12px', fontSize: 13, minHeight: 100, resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontWeight: 500 }} />
          </div>
          {result && <div style={{ fontSize: 12, fontWeight: 700, color: result.startsWith('✓') ? '#10B981' : '#EF4444' }}>{result}</div>}
          <button onClick={send} disabled={sending || !subject || !content}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (sending || !subject || !content) ? 0.5 : 1, transition: 'var(--transition)' }}>
            {sending ? 'Sending…' : 'Send Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const { getToken }   = useAuth();
  const [tickets,    setTickets]    = useState<any>({ data: [], meta: {} });
  const [loading,    setLoading]    = useState(true);
  const [status,     setStatus]     = useState('');
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState<any>(null);
  const [showNotify, setShowNotify] = useState(false);
  const [token,      setToken]      = useState('');

  const load = useCallback(async (tk?: string) => {
    const t = tk ?? token;
    if (!t) return;
    setLoading(true);
    try {
      const res = await listTickets(t, { status: status || undefined, page, limit: 20 });
      setTickets(res);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, status, page]);

  useEffect(() => {
    getToken().then(t => { if (t) { setToken(t); load(t); } });
  }, []);

  useEffect(() => { load(); }, [status, page]);

  const { data: rows = [], meta = {} } = tickets;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {selected && token && (
        <TicketPanel ticket={selected} token={token} onClose={() => setSelected(null)} onUpdate={() => { setSelected(null); load(); }} />
      )}
      {showNotify && token && (
        <NotifyModal token={token} onClose={() => setShowNotify(false)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>Support Inbox</h1>
          <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>{(meta as any).total?.toLocaleString() ?? '—'} tickets total</p>
        </div>
        <Button
          onClick={() => setShowNotify(true)}
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📢 Send Campaign
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', userSelect: 'none' }}>
        {['', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'].map(s => {
          const active = status === s;
          return (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              style={{
                borderRadius: '8px',
                border: '1px solid',
                borderColor: active ? 'var(--brand)' : 'var(--border)',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition)',
                backgroundColor: active ? 'var(--brand-light)' : 'var(--surface)',
                color: active ? 'var(--brand)' : 'var(--text-3)'
              }}
            >
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          );
        })}
      </div>

      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '8px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, userSelect: 'none' }}>
            <RefreshCw style={{ height: '18px', width: '18px', animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
            <span>Loading tickets…</span>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: '14px', fontWeight: 600 }}>
            {status ? `No ${status.replace(/_/g, ' ').toLowerCase()} tickets` : 'No tickets yet 🎉'}
          </div>
        ) : rows.map((ticket: any) => (
          <div
            key={ticket.id}
            onClick={() => setSelected(ticket)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.backgroundColor = 'var(--surface-2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
          >
            {/* Priority indicator */}
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 999, background: PRIORITY_COLORS[ticket.priority] ?? 'var(--text-3)', flexShrink: 0 }} />

            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--brand-light)',
              border: '1px solid rgba(79, 70, 229, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'var(--brand)',
            }}>
              {ticket.user?.fullName?.charAt(0) ?? '?'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</span>
                <StatusBadge status={ticket.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                {ticket.user?.fullName} · {ticket.user?.email} · {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                {ticket._count?.responses > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--brand)', fontWeight: 700 }}>💬 {ticket._count.responses} replies</span>
                )}
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>
              <PriorityDot priority={ticket.priority} />{ticket.priority}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(meta as any).totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '8px', userSelect: 'none' }}>
          {page > 1 && (
            <Button variant="ghost" onClick={() => setPage(p => p - 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>
              ← Prev
            </Button>
          )}
          <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 600 }}>Page {page} of {(meta as any).totalPages}</span>
          {page < (meta as any).totalPages && (
            <Button variant="ghost" onClick={() => setPage(p => p + 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>
              Next →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
