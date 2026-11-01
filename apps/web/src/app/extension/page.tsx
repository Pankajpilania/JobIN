import Link from 'next/link';
import { ArrowUpRight, Check, Chrome, Sparkles } from 'lucide-react';

const extensionUrl = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL?.trim();

export default function ExtensionPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--surface-2)', color: 'var(--text-1)' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          padding: '20px clamp(20px, 6vw, 88px)',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link href="/" style={{ color: 'var(--text-1)', fontSize: 20, fontWeight: 800 }}>
          JobIN
        </Link>
        <Link href="/dashboard" style={{ color: 'var(--brand-dark)', fontWeight: 700 }}>
          Open dashboard
        </Link>
      </header>

      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 'clamp(48px, 9vw, 96px) 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 20px',
            borderRadius: 18,
            color: '#006c49',
            background: 'var(--brand-light)',
          }}
        >
          <Chrome size={32} />
        </div>
        <p style={{ color: 'var(--brand-dark)', fontWeight: 800, letterSpacing: '.08em' }}>
          JOBIN FOR CHROME
        </p>
        <h1
          style={{
            margin: '12px 0',
            fontSize: 'clamp(36px, 7vw, 60px)',
            lineHeight: 1.05,
            letterSpacing: '-.045em',
          }}
        >
          Take your job search
          <br />
          <span style={{ color: 'var(--brand-dark)' }}>where you find work.</span>
        </h1>
        <p
          style={{
            maxWidth: 620,
            margin: '18px auto 28px',
            color: 'var(--text-2)',
            fontSize: 17,
            lineHeight: 1.7,
          }}
        >
          Spot supported job listings, tailor your resume, prepare a cover letter, and save
          opportunities to your JobIN tracker without losing your place.
        </p>

        {extensionUrl ? (
          <a
            href={extensionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '14px 22px',
              borderRadius: 10,
              color: '#082318',
              background: 'var(--brand)',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Add JobIN to Chrome <ArrowUpRight size={18} />
          </a>
        ) : (
          <div
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '14px 22px',
              borderRadius: 10,
              color: 'var(--text-2)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontWeight: 700,
            }}
          >
            <Chrome size={18} /> Chrome Web Store listing coming soon
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
            marginTop: 56,
            textAlign: 'left',
          }}
        >
          {[
            'Use your JobIN account to access your saved resumes.',
            'Get job details from supported job boards.',
            'Keep applications synced with your JobIN tracker.',
          ].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                gap: 10,
                padding: 18,
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'var(--surface)',
                color: 'var(--text-2)',
                lineHeight: 1.55,
              }}
            >
              <Check size={18} color="var(--brand-dark)" />
              {item}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 28, color: 'var(--text-3)', fontSize: 13 }}>
          <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Sign in with the same OCI account used for JobIN when the extension is published.
        </p>
      </section>
    </main>
  );
}
