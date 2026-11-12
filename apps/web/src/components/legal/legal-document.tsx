import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-mark';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export function LegalDocument({
  title,
  introduction,
  sections,
}: {
  title: string;
  introduction: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="public-page public-legal-page">
      <div className="legal-document">
        <header className="legal-header">
          <Link className="legal-wordmark" href="/" aria-label="JobIN home">
            <BrandLogo size={28} textColor="var(--text-1)" />
          </Link>
          <Link className="legal-back-link" href="/">
            Back to JobIN
          </Link>
        </header>

        <div className="legal-layout">
          <aside className="legal-index" aria-label="On this page">
            <p>JobIN policies</p>
            <nav>
              {sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="legal-content">
            <p className="legal-updated">Last updated 11 November 2026</p>
            <h1>{title}</h1>
            <div className="legal-introduction">{introduction}</div>
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.content}
              </section>
            ))}
            <p className="legal-contact">
              Questions? Email <a href="mailto:info@jobin.today">info@jobin.today</a>.
            </p>
          </article>
        </div>

        <footer className="legal-footer">
          <span>© 2026 JobIN</span>
          <nav aria-label="Legal pages">
            <Link href="/privacy-policy">Privacy policy</Link>
            <Link href="/terms-of-service">Terms of service</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
