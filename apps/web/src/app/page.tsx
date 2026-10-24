'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';

type Job = {
  logo: string;
  logoColor: string;
  title: string;
  company: string;
  locationCategory: string;
  tags: string[];
  match: number;
  time: string;
};

const ALL_JOBS: Job[] = [
  {
    logo: 'G',
    logoColor: '#4285F4',
    title: 'Senior Software Engineer',
    company: 'Google · London, UK',
    locationCategory: 'United Kingdom',
    tags: ['Remote', 'New today', '£90k–£130k', 'Senior'],
    match: 96,
    time: '2 hours ago',
  },
  {
    logo: 'M',
    logoColor: '#00A4EF',
    title: 'Product Manager — AI Platform',
    company: 'Microsoft · Manchester, UK',
    locationCategory: 'United Kingdom',
    tags: ['Hybrid', '£75k–£95k', 'Mid-level', 'Visa OK'],
    match: 88,
    time: '5 hours ago',
  },
  {
    logo: 'A',
    logoColor: '#FF5A5F',
    title: 'Data Scientist — Growth',
    company: 'Airbnb · Edinburgh, UK',
    locationCategory: 'United Kingdom',
    tags: ['Remote', 'New today', '£65k–£85k'],
    match: 82,
    time: '8 hours ago',
  },
  {
    logo: 'N',
    logoColor: '#E50914',
    title: 'Full Stack Engineer',
    company: 'Netflix · London, UK',
    locationCategory: 'United Kingdom',
    tags: ['Remote', '£80k–£110k', 'Mid-level'],
    match: 91,
    time: '1 day ago',
  },
  {
    logo: 'S',
    logoColor: '#635BFF',
    title: 'Frontend Engineer (React)',
    company: 'Stripe · Dublin, Ireland',
    locationCategory: 'Europe',
    tags: ['Hybrid', 'New today', '£70k–£90k', 'Visa OK'],
    match: 85,
    time: '4 hours ago',
  },
  {
    logo: 'O',
    logoColor: '#111827',
    title: 'Staff AI Engineer',
    company: 'OpenAI · San Francisco, US',
    locationCategory: 'United States',
    tags: ['Remote', 'New today', '$180k–$240k', 'Senior', 'Visa OK'],
    match: 98,
    time: '1 hour ago',
  },
  {
    logo: 'Ap',
    logoColor: '#111111',
    title: 'Senior UX Designer',
    company: 'Apple · Cupertino, US',
    locationCategory: 'United States',
    tags: ['Hybrid', '$140k–$180k', 'Senior'],
    match: 92,
    time: '3 hours ago',
  },
  {
    logo: 'Am',
    logoColor: '#FF9900',
    title: 'DevOps Specialist',
    company: 'Amazon · Seattle, US',
    locationCategory: 'United States',
    tags: ['On-site', '$130k–$160k', 'Mid-level'],
    match: 87,
    time: '1 day ago',
  },
];

const PLANS = [
  {
    plan: 'Free',
    price: '£0',
    desc: 'Explore the tools and get organised.',
    cta: 'Get started free',
    popular: false,
    features: [
      '20 AI credits per month',
      '5 resume analyses/mo',
      '5 cover letters/mo',
      'Basic match score',
      '10 job saves',
    ],
  },
  {
    plan: 'Pro',
    price: '£15',
    desc: 'For a focused, active job search.',
    cta: 'Start Pro',
    popular: true,
    features: [
      '100 AI credits per month',
      'Unlimited resume tailoring',
      'Unlimited cover letters',
      'Advanced ATS analysis',
      'Kanban job tracker',
      '100 autofill apps/mo',
    ],
  },
  {
    plan: 'Pro Max',
    price: '£29',
    desc: 'More support for every application.',
    cta: 'Start Pro Max',
    popular: false,
    features: [
      '500 AI credits per month',
      'Everything in Pro',
      'Unlimited autofill',
      'AI interview coach',
      'Insider referrals',
      'Priority AI processing',
    ],
  },
];

const FEATURES = [
  {
    title: 'Tailor your CV',
    desc: 'Bring your most relevant experience forward for the role you want.',
    demo: 'resume',
  },
  {
    title: 'Keep your search together',
    desc: 'Save roles, record progress and see the next step for every application.',
    demo: 'tracker',
  },
  {
    title: 'Prepare with purpose',
    desc: 'Practise role-specific interview questions and organise your notes.',
    demo: 'interview',
  },
];

function BrandMark() {
  return (
    <span className="jobin-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function MatchPreview({ job }: { job: Job }) {
  return (
    <div className="match-preview" data-ui="job-match-preview">
      <div className="preview-topline">
        <span className="preview-live">
          <i /> Example match
        </span>
        <span className="preview-menu" aria-hidden="true">
          ···
        </span>
      </div>
      <div className="preview-job">
        <span className="company-mark" style={{ color: job.logoColor }}>
          {job.logo}
        </span>
        <div className="preview-job-copy">
          <strong>{job.title}</strong>
          <span>{job.company}</span>
        </div>
        <span className="match-score">
          <b>{job.match}%</b>
          <small>match</small>
        </span>
      </div>
      <div className="preview-tags">
        <span>
          <MapPin size={13} />{' '}
          {job.locationCategory === 'United States'
            ? 'United States'
            : job.locationCategory === 'Europe'
              ? 'Europe'
              : 'United Kingdom'}
        </span>
        <span>
          <Clock3 size={13} /> {job.time}
        </span>
      </div>
      <div className="preview-skills">
        <span>Based on your profile</span>
        <div>
          <i>React</i>
          <i>TypeScript</i>
          <i>Product</i>
        </div>
      </div>
      <Link className="preview-action" href="/auth/signup">
        Explore this match <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}

function FeatureFragment({ kind }: { kind: string }) {
  if (kind === 'resume')
    return (
      <div className="feature-fragment resume-fragment" data-ui="resume-match-fragment">
        <div className="fragment-heading">
          <span className="fragment-file">
            <FileText size={17} />
          </span>
          <div>
            <b>Senior Software Engineer</b>
            <small>Example role · CV alignment</small>
          </div>
          <span className="fragment-percent">86%</span>
        </div>
        <div className="match-meter">
          <span />
        </div>
        <div className="keyword-list">
          <span className="keyword-found">
            <Check size={13} /> TypeScript
          </span>
          <span className="keyword-found">
            <Check size={13} /> React
          </span>
          <span className="keyword-add">
            <Sparkles size={13} /> System design
          </span>
        </div>
      </div>
    );
  if (kind === 'tracker')
    return (
      <div className="feature-fragment tracker-fragment" data-ui="application-tracker-fragment">
        <div className="tracker-title">
          <b>Application tracker</b>
          <span>Example board</span>
        </div>
        <div className="tracker-row">
          <span className="tracker-company">G</span>
          <div>
            <b>Software Engineer</b>
            <small>Google · Saved</small>
          </div>
          <span className="tracker-state">To apply</span>
        </div>
        <div className="tracker-row">
          <span className="tracker-company tracker-company-m">M</span>
          <div>
            <b>Product Manager</b>
            <small>Microsoft · Applied</small>
          </div>
          <span className="tracker-state tracker-state-done">In review</span>
        </div>
      </div>
    );
  return (
    <div className="feature-fragment interview-fragment" data-ui="interview-coach-fragment">
      <span className="interview-label">
        <Sparkles size={14} /> PRACTICE PROMPT
      </span>
      <b>Tell me about a project where you solved a difficult problem.</b>
      <div className="interview-bottom">
        <span>Software engineering · Example</span>
        <span className="play-mark">↗</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('Best matches');
  const [searchQuery, setSearchQuery] = useState('');
  const [workType, setWorkType] = useState('All');
  const [location, setLocation] = useState('All');

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!targets.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('motion-ready');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return () => document.documentElement.classList.remove('motion-ready');
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -35px 0px' },
    );
    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('motion-ready');
    };
  }, []);

  const filteredJobs = useMemo(
    () =>
      ALL_JOBS.filter((job) => {
        if (activeTab === 'Recently posted' && !job.tags.includes('New today')) return false;
        if (activeTab === 'Remote only' && !job.tags.includes('Remote')) return false;
        if (activeTab === 'Visa sponsored' && !job.tags.includes('Visa OK')) return false;
        const query = searchQuery.trim().toLowerCase();
        if (
          query &&
          !job.title.toLowerCase().includes(query) &&
          !job.company.toLowerCase().includes(query) &&
          !job.tags.some((tag) => tag.toLowerCase().includes(query))
        )
          return false;
        if (workType !== 'All' && !job.tags.includes(workType)) return false;
        if (
          location !== 'All' &&
          (location === 'Europe'
            ? job.locationCategory !== 'Europe' && job.locationCategory !== 'United Kingdom'
            : job.locationCategory !== location)
        )
          return false;
        return true;
      }).sort((a, b) => (activeTab === 'Best matches' ? b.match - a.match : 0)),
    [activeTab, location, searchQuery, workType],
  );

  const handleFindJobs = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document.getElementById('job-listings')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="jobin-home">
      <nav className="home-nav" aria-label="Main navigation">
        <Link href="/" className="brand-lockup" aria-label="JobIN home">
          <BrandMark />
          <span>
            Job<span>IN</span>
          </span>
        </Link>
        <div className="home-nav-links">
          <a href="#features">Features</a>
          <a href="#features">AI Resume</a>
          <a href="#jobs">Job Match</a>
          <a href="#pricing">Pricing</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className="home-nav-actions">
          <Link className="nav-signin" href="/auth/login">
            Sign in
          </Link>
          <Link className="button button-dark button-nav" href="/auth/signup">
            Get started <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            <span className="hero-title-line">
              <span>Apply smarter.</span>
            </span>
            <span className="hero-title-line hero-title-accent">
              <span>Get hired faster.</span>
            </span>
          </h1>
          <p>Find roles that fit, shape your application, and keep every next step in one place.</p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/auth/signup">
              Start for free <ArrowRight size={16} />
            </Link>
            <a className="text-link" href="#how-it-works">
              See how it works <ArrowRight size={15} />
            </a>
          </div>
          <div className="hero-points">
            <span>
              <Check size={14} /> Job matches
            </span>
            <span>
              <Check size={14} /> CV tools
            </span>
            <span>
              <Check size={14} /> Application tracking
            </span>
          </div>
        </div>
        <div className="hero-product">
          <MatchPreview job={ALL_JOBS[5]} />
          <div className="hero-product-note">
            <span className="note-spark">
              <Sparkles size={15} />
            </span>
            <span>
              <b>Find your fit.</b> Take the next step when you’re ready.
            </span>
          </div>
        </div>
        <span className="hero-orbit orbit-one" aria-hidden="true" />
        <span className="hero-orbit orbit-two" aria-hidden="true" />
      </section>

      <section className="jobs-section" id="jobs">
        <div className="section-intro jobs-intro" data-reveal>
          <div>
            <h2>
              Find a role worth
              <br />
              moving for.
            </h2>
          </div>
          <p>
            Explore example listings, narrow the search, and see which opportunities match what
            matters to you.
          </p>
        </div>
        <div className="jobs-workspace" data-reveal>
          <form className="job-search-form" onSubmit={handleFindJobs} role="search">
            <label className="job-query">
              <Search size={18} />
              <span className="sr-only">Job title, skills, or company</span>
              <input
                placeholder="Job title, skills, or company..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label className="select-wrap">
              <span className="sr-only">Work type</span>
              <select value={workType} onChange={(event) => setWorkType(event.target.value)}>
                <option value="All">All types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <label className="select-wrap">
              <span className="sr-only">Location</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="All">All locations</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Europe">Europe</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <button className="button button-dark search-submit" type="submit">
              Find jobs <ArrowRight size={15} />
            </button>
          </form>
          <div className="listings-heading">
            <h3>Example opportunities</h3>
            <span>{filteredJobs.length} roles in this sample</span>
          </div>
          <div className="job-tabs" role="tablist" aria-label="Filter example jobs">
            {['Best matches', 'Recently posted', 'Remote only', 'Visa sponsored'].map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="job-list" aria-live="polite">
            {filteredJobs.length ? (
              filteredJobs.map((job) => (
                <article className="job-card" key={job.title}>
                  <span className="company-mark" style={{ color: job.logoColor }}>
                    {job.logo}
                  </span>
                  <div className="job-card-main">
                    <h3>{job.title}</h3>
                    <p>{job.company}</p>
                    <div className="job-tags">
                      {job.tags.map((tag) => (
                        <span
                          className={
                            tag === 'Remote' || tag === 'Hybrid'
                              ? 'tag-work'
                              : tag === 'New today'
                                ? 'tag-new'
                                : ''
                          }
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="job-card-side">
                    <span className="job-match">
                      <b>{job.match}%</b> match
                    </span>
                    <span className="job-time">{job.time}</span>
                    <Link href="/auth/signup" className="job-apply">
                      1-click apply <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-jobs">
                No example roles match those filters. Try widening your search.
              </div>
            )}
          </div>
        </div>
        <p className="sample-note">
          Listings and match scores on this page are illustrative examples.
        </p>
      </section>

      <section className="feature-section" id="features">
        <div className="feature-intro" data-reveal>
          <h2>
            Each step
            <br />
            <em>counts.</em>
          </h2>
          <p>
            Bring the parts of a thoughtful job search together, from the first match to the next
            conversation.
          </p>
          <Link href="/auth/signup" className="text-link">
            Explore JobIN <ArrowRight size={15} />
          </Link>
        </div>
        <div className="feature-list">
          {FEATURES.map((feature, index) => (
            <article
              className={`feature-row feature-row-${index + 1}`}
              data-reveal
              key={feature.demo}
            >
              <div className="feature-description">
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
              <FeatureFragment kind={feature.demo} />
            </article>
          ))}
        </div>
      </section>

      <section className="process-section" id="how-it-works">
        <div className="process-heading" data-reveal>
          <h2>One search. Clear next steps.</h2>
          <p>Use the tools that help, at the pace that works for you.</p>
        </div>
        <div className="process-steps">
          <article data-reveal>
            <span className="step-word">First</span>
            <h3>Set your direction</h3>
            <p>Add your resume and the roles, skills, or locations you’re looking for.</p>
          </article>
          <article data-reveal>
            <span className="step-word">Then</span>
            <h3>Choose your matches</h3>
            <p>Review relevant openings and decide which ones are worth your time.</p>
          </article>
          <article data-reveal>
            <span className="step-word">Next</span>
            <h3>Move each one forward</h3>
            <p>Tailor your materials, prepare, and keep track of where you stand.</p>
          </article>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="pricing-heading" data-reveal>
          <h2>Start free. Find your pace.</h2>
          <p>Choose a plan for the tools you need during your search.</p>
        </div>
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article
              className={`price-card ${plan.popular ? 'price-card-featured' : ''}`}
              data-reveal
              key={plan.plan}
            >
              {plan.popular && <span className="popular-label">Most popular</span>}
              <span className="plan-name">{plan.plan}</span>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>/mo</span>
              </div>
              <p className="plan-desc">{plan.desc}</p>
              <Link
                href={`/upgrade?plan=${plan.plan === 'Pro Max' ? 'PRO' : 'PREMIUM'}`}
                className={`button ${plan.popular ? 'button-dark' : 'button-outline'}`}
              >
                {plan.cta} <ArrowRight size={15} />
              </Link>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="price-footnote">
          Plan limits and features are subject to change. Sign up to see current details.
        </p>
      </section>

      <section className="closing-section" data-reveal>
        <span className="closing-mark">
          <BrandMark />
        </span>
        <div>
          <h2>
            Bring your search
            <br />
            into focus.
          </h2>
          <p>Find roles, prepare your application, and keep moving.</p>
        </div>
        <Link href="/auth/signup" className="button button-mint">
          Get started free <ArrowUpRight size={16} />
        </Link>
      </section>

      <footer className="home-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="brand-lockup">
              <BrandMark />
              <span>
                Job<span>IN</span>
              </span>
            </Link>
            <p>A focused workspace for your job search.</p>
          </div>
          <div className="footer-column">
            <b>Explore</b>
            <a href="#jobs">Job matches</a>
            <a href="#features">Resume tools</a>
            <a href="#how-it-works">How it works</a>
          </div>
          <div className="footer-column">
            <b>Account</b>
            <Link href="/auth/login">Sign in</Link>
            <Link href="/auth/signup">Create account</Link>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-column">
            <b>Company</b>
            <a href="#privacy">Privacy policy</a>
            <a href="#terms">Terms of service</a>
            <a href="mailto:hello@jobin.app">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 JobIN</span>
          <span>Made for the next step in your search.</span>
        </div>
      </footer>
    </main>
  );
}
