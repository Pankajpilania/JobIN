import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';
import { Web3FormsForm } from '@/components/support/web3forms-form';

export default function ContactPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '24px', background: 'var(--surface-2)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--brand-dark)', fontWeight: 800 }}>
          JobIN
        </Link>
        <section
          style={{
            display: 'grid',
            gap: 18,
            marginTop: 32,
            padding: 'clamp(24px, 6vw, 48px)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            background: 'var(--surface)',
          }}
        >
          <div style={{ color: 'var(--brand-dark)' }}>
            <Mail size={28} />
          </div>
          <div>
            <h1
              style={{
                margin: '0 0 8px',
                fontSize: 'clamp(30px, 6vw, 38px)',
                letterSpacing: '-.035em',
              }}
            >
              Contact JobIN
            </h1>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>
              Have a question, partnership idea, or feedback about JobIN? Send us a message and
              we’ll get back to you.
            </p>
          </div>
          <Web3FormsForm type="contact" />
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6 }}>
            Your message is processed by Web3Forms and forwarded to our configured inbox. Please
            don’t include passwords, sign-in codes, or payment details.
          </p>
          <a
            href="mailto:159ring@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--brand-dark)',
              fontWeight: 800,
            }}
          >
            159ring@gmail.com <ArrowUpRight size={16} />
          </a>
        </section>
      </div>
    </main>
  );
}
