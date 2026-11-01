import Link from 'next/link';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '24px', background: 'var(--surface-2)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--brand-dark)', fontWeight: 800 }}>
          JobIN
        </Link>
        <section
          style={{
            marginTop: 32,
            padding: 'clamp(24px, 6vw, 56px)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', gap: 10, color: 'var(--brand-dark)', fontWeight: 800 }}>
            <Compass size={20} /> ABOUT JOBIN
          </div>
          <h1 style={{ maxWidth: 700, margin: '18px 0', fontSize: 'clamp(36px, 6vw, 54px)', letterSpacing: '-.04em', lineHeight: 1.08 }}>
            A clearer, more focused job search.
          </h1>
          <p style={{ maxWidth: 700, color: 'var(--text-2)', fontSize: 17, lineHeight: 1.75 }}>
            JobIN brings practical tools for the job-search journey into one workspace. Organise
            opportunities, tailor your resume, prepare application materials, and keep track of
            what comes next.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginTop: 28,
            }}
          >
            {[
              ['Stay organised', 'Keep applications and next steps together in one tracker.'],
              ['Apply with focus', 'Shape your resume and cover letters around each opportunity.'],
              ['Keep moving', 'Use a single workspace to prepare for the next step.'],
            ].map(([title, description]) => (
              <article
                key={title}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}
              >
                <Sparkles size={18} color="var(--brand-dark)" />
                <h2 style={{ margin: '12px 0 6px', fontSize: 17 }}>{title}</h2>
                <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{description}</p>
              </article>
            ))}
          </div>
          <Link
            href="/auth/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 28,
              color: 'var(--brand-dark)',
              fontWeight: 800,
            }}
          >
            Get started with JobIN <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </main>
  );
}
