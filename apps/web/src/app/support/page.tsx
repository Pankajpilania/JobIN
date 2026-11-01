import Link from 'next/link';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { SupportAssistant } from '@/components/support/support-assistant';
import { Web3FormsForm } from '@/components/support/web3forms-form';

const cardStyle = {
  padding: 'clamp(20px, 4vw, 30px)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  background: 'var(--surface)',
};

export default function SupportPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '24px', background: 'var(--surface-2)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', display: 'grid', gap: 18 }}>
        <Link href="/" style={{ color: 'var(--brand-dark)', fontWeight: 800 }}>
          JobIN
        </Link>
        <header style={cardStyle}>
          <div style={{ color: 'var(--brand-dark)' }}>
            <MessageCircle size={28} />
          </div>
          <h1
            style={{
              margin: '14px 0 8px',
              fontSize: 'clamp(30px, 6vw, 38px)',
              letterSpacing: '-.035em',
            }}
          >
            How can we help?
          </h1>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>
            Get quick answers from AI support or send a ticket to our team. Include the email
            address on your account and a short description of the issue. Never send your password
            or sign-in codes.
          </p>
        </header>

        <SupportAssistant />

        <section aria-labelledby="support-ticket-title" style={cardStyle}>
          <h2 id="support-ticket-title" style={{ margin: '0 0 8px', fontSize: 21 }}>
            Submit a support ticket
          </h2>
          <p style={{ margin: '0 0 18px', color: 'var(--text-2)', lineHeight: 1.6 }}>
            The support team can help with your account, resumes, applications, billing, or the
            JobIN extension.
          </p>
          <Web3FormsForm type="support" />
          <a
            href="mailto:159ring@gmail.com?subject=JobIN%20Support"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
              color: 'var(--brand-dark)',
              fontWeight: 800,
            }}
          >
            <Mail size={17} /> Or email 159ring@gmail.com
          </a>
        </section>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: 14,
            borderRadius: 10,
            background: 'var(--surface)',
            color: 'var(--text-3)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          For your safety, support will never ask for your password, one-time code, or payment card
          security code.
        </div>
      </div>
    </main>
  );
}
