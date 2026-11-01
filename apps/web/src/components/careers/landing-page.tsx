'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Menu,
  Quote,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  faqs,
  features,
  footerColumns,
  jobHubStats,
  stats,
  testimonials,
} from '@/lib/careers-content';
import { prefersReducedMotion, useInView } from '@/lib/careers-motion';
import styles from './landing-page.module.css';

const signupHref = '/sign-up';

export function Logo() {
  return (
    <Link href="/careers" className={styles.logo} aria-label="JobIN home">
      <span className={styles.logoMark}>
        <Sparkles size={19} aria-hidden="true" />
      </span>
      JobIN
    </Link>
  );
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [audience, setAudience] = useState<'seekers' | 'employers'>('seekers');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const featuresId = useId();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const drawer = drawerRef.current;
    const focusable = () =>
      drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [];
    focusable()[0]?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(focusable());
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ''}`}>
      <div className={`${styles.container} ${styles.navInner}`}>
        <Logo />
        <nav className={styles.navLinks} aria-label="Main navigation">
          <div className={styles.audienceToggle} aria-label="Choose your audience">
            <button
              type="button"
              className={audience === 'seekers' ? styles.audienceActive : ''}
              aria-pressed={audience === 'seekers'}
              onClick={() => setAudience('seekers')}
            >
              Job seekers
            </button>
            <button
              type="button"
              className={audience === 'employers' ? styles.audienceActive : ''}
              aria-pressed={audience === 'employers'}
              onClick={() => setAudience('employers')}
            >
              Employers
            </button>
          </div>
          <div className={styles.featureMenu}>
            <button
              type="button"
              className={styles.featureMenuButton}
              aria-expanded={isFeaturesOpen}
              aria-controls={featuresId}
              onClick={() => setIsFeaturesOpen((open) => !open)}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) {
                  setIsFeaturesOpen(false);
                }
              }}
            >
              Features <ChevronDown size={15} aria-hidden="true" />
            </button>
            {isFeaturesOpen && (
              <div id={featuresId} className={styles.featureMenuList}>
                <a href="#features" onClick={() => setIsFeaturesOpen(false)}>
                  AI job matches
                </a>
                <a href="#features" onClick={() => setIsFeaturesOpen(false)}>
                  Resume tools
                </a>
                <a href="#features" onClick={() => setIsFeaturesOpen(false)}>
                  Interview copilot
                </a>
              </div>
            )}
          </div>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className={styles.navActions}>
          <Link className={styles.signIn} href="/sign-in">
            Sign in
          </Link>
          <Link className={styles.button} href={signupHref}>
            Join now <ArrowUpRight size={16} />
          </Link>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuToggle}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="careers-mobile-drawer"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        {isMenuOpen && (
          <nav
            ref={drawerRef}
            id="careers-mobile-drawer"
            className={styles.mobileDrawer}
            aria-label="Mobile navigation"
          >
            <div className={styles.audienceToggle} aria-label="Choose your audience">
              <button
                type="button"
                className={audience === 'seekers' ? styles.audienceActive : ''}
                aria-pressed={audience === 'seekers'}
                onClick={() => setAudience('seekers')}
              >
                Job seekers
              </button>
              <button
                type="button"
                className={audience === 'employers' ? styles.audienceActive : ''}
                aria-pressed={audience === 'employers'}
                onClick={() => setAudience('employers')}
              >
                Employers
              </button>
            </div>
            <a href="#features" onClick={closeMenu}>
              Features
            </a>
            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>
            <a href="#testimonials" onClick={closeMenu}>
              Stories
            </a>
            <a href="#faq" onClick={closeMenu}>
              FAQ
            </a>
            <div className={styles.drawerActions}>
              <Link
                className={`${styles.button} ${styles.buttonSecondary}`}
                href="/sign-in"
                onClick={closeMenu}
              >
                Sign in
              </Link>
              <Link className={styles.button} href={signupHref} onClick={closeMenu}>
                Join now
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={`${styles.heroCopy} ${styles.stagger}`}>
          <div className={styles.heroKicker}>
            <Sparkles size={15} aria-hidden="true" />A calmer way to find your next role
          </div>
          <h1 className={styles.heroTitle}>
            Your next chapter,
            <span>starts with a match.</span>
          </h1>
          <p className={styles.heroDescription}>
            Find roles that fit, make every application count, and get ready for what’s next—with an
            AI-powered copilot in your corner.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.button} href={signupHref}>
              Try For Free <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className={`${styles.button} ${styles.buttonSecondary}`} href="#features">
              Explore features <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.trustLine}>
            <span>Built for your next move</span>
            <div className={styles.trustBrands} aria-label="Tools for your job search">
              <span className={styles.trustBrand} aria-label="Resume">
                CV
              </span>
              <span className={styles.trustBrand} aria-label="Interview">
                Q
              </span>
              <span className={styles.trustBrand} aria-label="Job search">
                J
              </span>
              <span className={styles.trustBrand} aria-label="Career">
                ↗
              </span>
            </div>
            <span>one thoughtful step at a time</span>
          </div>
        </div>

        <div
          className={styles.heroVisual}
          aria-label="Illustration of the JobIN job match dashboard"
        >
          <div className={styles.decorativeOrb} aria-hidden="true" />
          <div className={styles.heroDashboard}>
            <div className={styles.dashboardTop}>
              <div className={styles.dashboardBrand}>
                <span className={styles.logoMark}>
                  <Sparkles size={15} />
                </span>
                Your job matches
              </div>
              <div className={styles.dashboardDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className={styles.matchHeading}>
              <div>
                <strong>Picked for your next move</strong>
                <small>Based on your goals and experience</small>
              </div>
              <span className={styles.matchPill}>Updated today</span>
            </div>
            <div className={styles.mockJobList}>
              {[
                {
                  initial: 'N',
                  title: 'Product Designer',
                  meta: 'Northstar Studio · London · Hybrid',
                  match: '96% match',
                },
                {
                  initial: 'G',
                  title: 'Senior UX Designer',
                  meta: 'Greenhouse Labs · Remote · UK',
                  match: '91% match',
                },
                {
                  initial: 'F',
                  title: 'Experience Designer',
                  meta: 'Fieldnote · Manchester · Flexible',
                  match: '88% match',
                },
              ].map((job) => (
                <div className={styles.mockJobCard} key={job.title}>
                  <span className={styles.companyMark}>{job.initial}</span>
                  <div className={styles.jobCardCopy}>
                    <strong>{job.title}</strong>
                    <span>{job.meta}</span>
                  </div>
                  <span className={styles.jobMatch}>{job.match}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.heroFloatCard}>
            <span className={styles.floatCheck}>
              <Check size={17} />
            </span>
            <span>One more great-fit role, found.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountUp({
  value,
  suffix = '',
  prefix = '',
}: {
  value: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isVisible = useInView(ref, 0.2);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    if (prefersReducedMotion()) {
      setCount(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>
        <span className={styles.eyebrowDot} />
        {eyebrow}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useInView(ref);
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${isVisible ? styles.revealVisible : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatsStrip() {
  return (
    <section className={styles.statsSection} aria-label="JobIN at a glance">
      <div className={styles.container}>
        <Reveal>
          <div className={styles.statsGrid}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div className={styles.statCard} key={stat.label}>
                  <span className={styles.statIcon}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <strong className={styles.statValue}>
                      <CountUp value={stat.value} suffix={stat.suffix} />
                    </strong>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
        <p className={styles.statsDisclaimer}>
          Illustrative figures for this design preview — replace with verified JobIN results before
          publishing.
        </p>
      </div>
    </section>
  );
}

export function JobHubCounters() {
  return (
    <section id="how-it-works" className={`${styles.section} ${styles.hubSection}`}>
      <div className={styles.container}>
        <SectionHeading
          eyebrow="A wider view"
          title="More possibilities, less searching."
          description="Start with the wider job market, then focus on the opportunities that fit where you want to go."
        />
        <Reveal>
          <div className={styles.hubGrid}>
            {jobHubStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div className={styles.hubCard} key={stat.label}>
                  <span className={styles.hubCardIcon}>
                    <Icon size={21} />
                  </span>
                  <strong className={styles.hubNumber}>
                    <CountUp value={stat.value} prefix="+" />
                  </strong>
                  <span className={styles.hubLabel}>{stat.label}</span>
                </div>
              );
            })}
          </div>
        </Reveal>
        <p className={styles.statsDisclaimer}>
          Sample dashboard counts shown for layout purposes; connect verified live job data before
          publishing.
        </p>
      </div>
    </section>
  );
}

function FeaturePreview({ index }: { index: number }) {
  const feature = features[index];
  return (
    <div className={styles.featureVisual} key={feature.title}>
      <div className={styles.featureBrowser}>
        <div className={styles.featureBrowserTop}>
          <div className={styles.browserDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className={styles.browserCaption}>jobin.today · your workspace</span>
          <Sparkles size={15} color="#07885f" aria-hidden="true" />
        </div>
        <div className={styles.featureBrowserContent}>
          <small>{feature.eyebrow}</small>
          <h3>{feature.highlight}</h3>
          {[
            {
              letter: 'A',
              title: 'A role worth a closer look',
              meta: 'Product team · Flexible location',
            },
            {
              letter: 'B',
              title: 'A practical next step',
              meta: 'Your experience lines up with the brief',
            },
            { letter: 'C', title: 'A clearer application', meta: 'Ready when you are' },
          ].map((row, rowIndex) => (
            <div className={styles.featureMockRow} key={row.letter}>
              <span>{row.letter}</span>
              <div className={styles.mockRowCopy}>
                <strong>{row.title}</strong>
                <small>{row.meta}</small>
              </div>
              <span className={styles.featureMetric}>
                {rowIndex === 0 ? feature.metric : 'Good fit'}
              </span>
            </div>
          ))}
          <Link href={signupHref} className={`${styles.button} ${styles.featureCta}`}>
            See how it works <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % features.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const buttons = buttonRefs.current.filter((button): button is HTMLButtonElement =>
      Boolean(button),
    );
    if (!buttons.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) {
          const index = buttons.indexOf(mostVisible.target as HTMLButtonElement);
          if (index >= 0) setActive(index);
        }
      },
      { threshold: [0.6] },
    );
    buttons.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, []);

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      nextIndex = (currentIndex + 1) % features.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      nextIndex = (currentIndex - 1 + features.length) % features.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = features.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setActive(nextIndex);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <section id="features" className={`${styles.section} ${styles.featureSection}`}>
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Your search, supported"
          title="Everything you need to move forward."
          description="A practical set of tools for the real work behind a great next step."
        />
        <div className={styles.featureGrid}>
          <div
            className={`${styles.featureList} ${styles.featureTabsDesktop}`}
            role="tablist"
            aria-label="JobIN features"
            aria-orientation="vertical"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const selected = index === active;
              return (
                <button
                  key={feature.title}
                  ref={(element) => {
                    buttonRefs.current[index] = element;
                  }}
                  id={`feature-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="feature-panel"
                  tabIndex={selected ? 0 : -1}
                  className={`${styles.featureTab} ${selected ? styles.featureTabActive : ''}`}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => handleTabKey(event, index)}
                >
                  <span className={styles.featureTabHead}>
                    <Icon size={20} aria-hidden="true" />
                    {feature.title}
                  </span>
                  <p>{feature.description}</p>
                  <span className={styles.featureProgress} aria-hidden="true">
                    <span />
                  </span>
                </button>
              );
            })}
          </div>
          <div
            id="feature-panel"
            className={styles.featureShowcase}
            role="tabpanel"
            aria-labelledby={`feature-tab-${active}`}
          >
            <FeaturePreview index={active} />
          </div>

          <div className={styles.mobileFeatureList}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isOpen = index === active;
              return (
                <div
                  key={feature.title}
                  className={`${styles.mobileFeatureItem} ${isOpen ? styles.mobileFeatureOpen : ''}`}
                >
                  <button
                    type="button"
                    className={styles.mobileFeatureButton}
                    aria-expanded={isOpen}
                    aria-controls={`mobile-feature-panel-${index}`}
                    onClick={() => setActive(isOpen ? 0 : index)}
                  >
                    <Icon size={20} aria-hidden="true" />
                    {feature.title}
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div
                      id={`mobile-feature-panel-${index}`}
                      className={styles.mobileFeaturePanel}
                      role="region"
                      aria-label={feature.title}
                    >
                      <p>{feature.description}</p>
                      <FeaturePreview index={index} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ item }: { item: (typeof testimonials)[number] }) {
  return (
    <article className={styles.testimonialCard}>
      <blockquote>“{item.quote}”</blockquote>
      <div className={styles.testimonialAuthor}>
        <span
          className={`${styles.avatar} ${styles[`tone-${item.tone}`] ?? ''}`}
          aria-hidden="true"
        >
          {item.initials}
        </span>
        <span>
          <strong>{item.name}</strong>
          <small>{item.role}</small>
        </span>
      </div>
    </article>
  );
}

export function Testimonials() {
  const firstRow = [...testimonialsForRow(0), ...testimonialsForRow(0)];
  const secondRow = [...testimonialsForRow(1), ...testimonialsForRow(1)];
  return (
    <section id="testimonials" className={styles.testimonials}>
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Real job-search days"
          title="A little more momentum goes a long way."
          description="Illustrative perspectives on making the job-search journey feel more manageable."
        />
      </div>
      <div className={styles.marquee} aria-label="JobIN community testimonials">
        <p className={styles.illustrationNote}>
          Illustrative sample stories and personas, not customer endorsements.
        </p>
        <div className={styles.marqueeRow}>
          <div className={styles.marqueeTrack}>
            {firstRow.map((item, index) => (
              <TestimonialCard key={`${item.name}-${index}`} item={item} />
            ))}
          </div>
        </div>
        <div className={`${styles.marqueeRow} ${styles.marqueeRowReverse}`}>
          <div className={styles.marqueeTrack}>
            {secondRow.map((item, index) => (
              <TestimonialCard key={`${item.name}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function testimonialsForRow(row: number) {
  return testimonials.filter((_, index) => index % 2 === row);
}

export function ExpertQuoteBand() {
  return (
    <section className={styles.quoteBand}>
      <div className={`${styles.container} ${styles.quoteInner}`}>
        <div>
          <Quote size={29} className={styles.quoteIcon} aria-hidden="true" />
          <blockquote className={styles.quoteText}>
            “A job search doesn’t have to define your whole day. Make the next step clear, then take
            it at your own pace.”
          </blockquote>
          <div className={styles.quoteAuthor}>
            <span className={styles.quotePhoto}>
              <svg
                viewBox="0 0 50 50"
                role="img"
                aria-label="Illustrated portrait of a career coach"
              >
                <circle cx="25" cy="25" r="25" fill="#7ec99d" />
                <path d="M8 48c1-10 7-15 17-15s16 5 17 15" fill="#315c46" />
                <circle cx="25" cy="20" r="10" fill="#f2c5a6" />
                <path
                  d="M14 20c0-9 5-14 12-14 7 0 11 5 11 13-3-3-6-4-10-4-4 0-8 2-13 5"
                  fill="#293d32"
                />
              </svg>
            </span>
            <span>
              <strong>Maya Ellis</strong>
              <small>Career coach &amp; interview mentor</small>
            </span>
          </div>
          <p className={styles.illustrationNote}>
            Illustrative expert quote, not an actual endorsement.
          </p>
        </div>
        <div className={styles.quoteMark} aria-hidden="true">
          <Sparkles size={58} strokeWidth={1.2} />
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className={`${styles.section} ${styles.faqSection}`}>
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Good to know"
          title="Questions, meet answers."
          description="A few helpful details before you take your next step."
        />
        <div className={styles.faqList}>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;
            return (
              <div
                className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
                key={faq.question}
              >
                <h3>
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    {faq.question}
                    <ChevronDown size={18} className={styles.faqChevron} aria-hidden="true" />
                  </button>
                </h3>
                <div
                  id={answerId}
                  className={styles.faqAnswer}
                  role="region"
                  aria-label={faq.question}
                  aria-hidden={!isOpen}
                >
                  <div className={styles.faqAnswerInner}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function QuickSearch() {
  const router = useRouter();
  const [error, setError] = useState('');

  const submitSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const title = String(formData.get('title') ?? '').trim();
      if (!title) {
        setError('Add a job title or keyword to start your search.');
        return;
      }
      setError('');
      const params = new URLSearchParams();
      params.set('title', title);
      params.set('model', String(formData.get('model') ?? 'any'));
      params.set('location', String(formData.get('location') ?? '').trim());
      params.set('experience', String(formData.get('experience') ?? 'any'));
      router.push(`/jobs?${params.toString()}`);
    },
    [router],
  );

  return (
    <section className={styles.searchSection} aria-labelledby="quick-search-title">
      <div className={`${styles.container} ${styles.searchPanel}`}>
        <div className={styles.searchPanelHeader}>
          <h2 id="quick-search-title">Your next role is out there.</h2>
          <p>Start with what matters to you. You can refine your search as you go.</p>
        </div>
        <form className={styles.quickSearch} onSubmit={submitSearch} role="search">
          <label className={styles.field}>
            Job title or keyword
            <input name="title" placeholder="e.g. product designer" maxLength={100} required />
          </label>
          <label className={styles.field}>
            Work model
            <select name="model" defaultValue="any">
              <option value="any">Any model</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </label>
          <label className={styles.field}>
            Location
            <input name="location" placeholder="City or region" maxLength={100} />
          </label>
          <label className={styles.field}>
            Experience
            <select name="experience" defaultValue="any">
              <option value="any">Any level</option>
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior</option>
            </select>
          </label>
          <button className={styles.button} type="submit">
            <Search size={17} /> Go
          </button>
        </form>
        {error && (
          <p className={styles.searchError} role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Logo />
            <p>A little more clarity for every next step in your job search.</p>
            <div className={styles.socialLinks} aria-label="Social profiles coming soon">
              <span aria-label="LinkedIn profile coming soon">
                <Linkedin size={16} />
              </span>
              <span aria-label="Instagram profile coming soon">
                <Instagram size={16} />
              </span>
              <span aria-label="Facebook profile coming soon">
                <Facebook size={16} />
              </span>
            </div>
          </div>
          {footerColumns.map((column) => (
            <nav className={styles.footerColumn} aria-label={column.title} key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} JobIN. Make your next move yours.</span>
          <nav className={styles.footerLegal} aria-label="Legal">
            <Link href="/about">Privacy &amp; safety</Link>
            <Link href="/support">Terms &amp; support</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function CareersLandingPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main>
        <Hero />
        <StatsStrip />
        <JobHubCounters />
        <FeatureShowcase />
        <Testimonials />
        <ExpertQuoteBand />
        <FAQ />
        <QuickSearch />
      </main>
      <Footer />
    </div>
  );
}
