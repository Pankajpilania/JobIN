'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownUp,
  ArrowUpRight,
  BookmarkPlus,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useCreateApplication } from '@/hooks/use-applications';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import styles from './job-search-panel.module.css';

type SourceName = 'Arbeitnow' | 'Remote OK' | 'Greenhouse' | 'Lever' | 'Ashby';
type PostedWithin = '' | '24h' | '7d' | '30d';
type SortOrder = 'newest' | 'relevance';

interface JobFilters {
  query: string;
  location: string;
  remoteOnly: boolean;
  visaSponsorshipOnly: boolean;
  source: '' | SourceName;
  postedWithin: PostedWithin;
  sort: SortOrder;
  pageSize: number;
}

interface SearchJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  visaSponsorshipLikely: boolean;
  workplaceType?: string;
  employmentType?: string;
  url: string;
  description: string;
  salary?: string;
  postedAt?: string;
  source: string;
  tags: string[];
}

interface SearchResponse {
  jobs: SearchJob[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  suggestions?: { roles: string[]; locations: string[] };
  lastSyncedAt: string | null;
  sources: Array<{
    name: string;
    source: string;
    sourceBoard: string;
    attributionUrl: string;
    availability: 'available' | 'stale' | 'pending' | 'unavailable';
    lastSuccessAt: string | null;
    error?: string | null;
  }>;
  sourceErrors: Array<{ name: string; error: string }>;
}

const DEFAULT_FILTERS: JobFilters = {
  query: '',
  location: '',
  remoteOnly: false,
  visaSponsorshipOnly: false,
  source: '',
  postedWithin: '',
  sort: 'newest',
  pageSize: 50,
};

const sourceOptions: SourceName[] = ['Arbeitnow', 'Remote OK', 'Greenhouse', 'Lever', 'Ashby'];

function relativeTime(value?: string | null) {
  if (!value) return 'Date not provided';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Date not provided';
  const difference = timestamp - Date.now();
  const absolute = Math.abs(difference);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  const [unit, length] = units.find(([, size]) => absolute >= size) ?? ['minute', 60 * 1000];
  const amount = Math.max(1, Math.round(difference / length));
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(amount, unit);
}

function formatSyncTime(value: string | null) {
  if (!value) return 'Waiting for first feed sync';
  const date = new Date(value);
  return `Updated ${relativeTime(value)} · ${new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

function readInitialFilters(): { filters: JobFilters; page: number } {
  const params = new URLSearchParams(window.location.search);
  const source = sourceOptions.find((item) => item === params.get('source')) ?? '';
  const posted = ['24h', '7d', '30d'].find((item) => item === params.get('postedWithin')) ?? '';
  const sort = params.get('sort') === 'relevance' ? 'relevance' : 'newest';
  const pageSize = Number(params.get('pageSize'));
  return {
    filters: {
      query: params.get('query') ?? '',
      location: params.get('location') ?? '',
      remoteOnly: params.get('remoteOnly') === 'true',
      visaSponsorshipOnly: params.get('visaSponsorshipOnly') === 'true',
      source: source as JobFilters['source'],
      postedWithin: posted as PostedWithin,
      sort,
      pageSize: [10, 25, 50, 100].includes(pageSize) ? pageSize : 50,
    },
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

function availabilityLabel(value: SearchResponse['sources'][number]['availability']) {
  switch (value) {
    case 'available':
      return 'Up to date';
    case 'stale':
      return 'Last refresh failed';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Waiting for sync';
  }
}

const POPULAR_COUNTRIES = [
  'Australia', 'Brazil', 'Canada', 'France', 'Germany', 'India', 'Ireland', 'Japan',
  'Netherlands', 'New Zealand', 'Singapore', 'Spain', 'United Arab Emirates',
  'United Kingdom', 'United States',
];

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export default function JobSearchPage() {
  const { getToken, isReady, isSignedIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const createApplication = useCreateApplication();
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => new Set());
  const initialSearchStarted = useRef(false);

  const loadJobs = useCallback(
    async (nextFilters: JobFilters, page: number) => {
      setLoading(true);
      setError('');
      try {
        const token = await getToken();
        if (!token) throw new Error('Your session has expired. Please sign in again.');

        const params = new URLSearchParams();
        if (nextFilters.query.trim()) params.set('query', nextFilters.query.trim());
        if (nextFilters.location.trim()) params.set('location', nextFilters.location.trim());
        if (nextFilters.remoteOnly) params.set('remoteOnly', 'true');
        if (nextFilters.visaSponsorshipOnly) params.set('visaSponsorshipOnly', 'true');
        if (nextFilters.source) params.set('source', nextFilters.source);
        if (nextFilters.postedWithin) params.set('postedWithin', nextFilters.postedWithin);
        params.set('sort', nextFilters.sort);
        params.set('page', String(page));
        params.set('pageSize', String(nextFilters.pageSize));

        const result = await apiClient.get<SearchResponse>(`/job-search?${params.toString()}`, token);
        setResponse(result);
        setAppliedFilters(nextFilters);
        setCurrentPage(result.pagination.page);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Could not load jobs.';
        setError(message);
        setResponse(null);
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    if (!isReady || !isSignedIn || initialSearchStarted.current) return;
    initialSearchStarted.current = true;
    const initial = readInitialFilters();
    setFilters(initial.filters);
    void loadJobs(initial.filters, initial.page);
  }, [isReady, isSignedIn, loadJobs]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadJobs(filters, 1);
  };

  const saveJob = async (job: SearchJob) => {
    try {
      await createApplication.mutateAsync({
        jobTitle: job.title,
        companyName: job.company,
        location: job.location,
        jobUrl: job.url,
        jobDescription: job.description,
        salary: job.salary,
        source: job.source,
      });
      setSavedJobs((previous) => new Set(previous).add(job.id));
      toast.success('Job added to your tracker.');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not save this job.');
    }
  };

  const pagination = response?.pagination;
  const healthyFeed = response?.sources.some((source) =>
    source.availability === 'available' || source.availability === 'stale',
  ) ?? false;
  const feedNotReady = Boolean(response && response.jobs.length === 0 && !healthyFeed);
  const waitingForSync = Boolean(
    feedNotReady && response?.sources.every((source) => source.availability === 'pending'),
  );
  const startResult = pagination && pagination.total > 0 ? (currentPage - 1) * pagination.pageSize + 1 : 0;
  const endResult = pagination ? Math.min(currentPage * pagination.pageSize, pagination.total) : 0;
  const roleSuggestions = unique(response?.suggestions?.roles ?? []);
  const locationSuggestions = unique([...POPULAR_COUNTRIES, ...(response?.suggestions?.locations ?? [])]);

  return (
    <div className={styles.page} id="job-discovery">
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}><span /> YOUR NEXT OPPORTUNITY</span>
          <h1>Find work that moves you forward.</h1>
          <p>Search <strong>{pagination?.total.toLocaleString() ?? 'fresh'}</strong> opportunities by role, skill, company, or place.</p>
        </div>
        <div
          className={`${styles.syncPill} ${feedNotReady ? (waitingForSync ? styles.syncWaiting : styles.syncUnavailable) : ''}`}
          title={response?.lastSyncedAt ?? 'Waiting for the first feed sync'}
        >
          <span className={styles.syncDot} />
          {feedNotReady
            ? waitingForSync ? 'Updating from job boards' : 'Job feed needs attention'
            : formatSyncTime(response?.lastSyncedAt ?? null)}
        </div>
      </header>

      <Card className={styles.filterCard} hoverEffect={false}>
        <form onSubmit={submitSearch}>
          <div className={styles.filterHeading}>
            <div className={styles.filterHeadingIcon}><SlidersHorizontal size={17} /></div>
            <div>
              <h2>Shape your search</h2>
              <p>Use any combination of filters to narrow the catalogue.</p>
            </div>
          </div>

          <div className={styles.filterGrid}>
            <label className={`${styles.field} ${styles.keywordField}`}>
              <span>Job role or skills</span>
              <input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="e.g. Product Designer"
                maxLength={100}
                autoComplete="off"
                list="job-role-suggestions"
                aria-autocomplete="list"
              />
              <datalist id="job-role-suggestions">
                {roleSuggestions.map((role) => <option key={role} value={role} />)}
              </datalist>
            </label>
            <label className={styles.field}>
              <span>Country or city</span>
              <input
                value={filters.location}
                onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
                placeholder="Start typing a country or city"
                maxLength={100}
                autoComplete="off"
                list="job-location-suggestions"
                aria-autocomplete="list"
              />
              <datalist id="job-location-suggestions">
                {locationSuggestions.map((location) => <option key={location} value={location} />)}
              </datalist>
            </label>
            <label className={styles.field}>
              <span>Source</span>
              <select
                value={filters.source}
                onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as JobFilters['source'] }))}
              >
                <option value="">All sources</option>
                {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Posted</span>
              <select
                value={filters.postedWithin}
                onChange={(event) => setFilters((current) => ({ ...current, postedWithin: event.target.value as PostedWithin }))}
              >
                <option value="">Any time</option>
                <option value="24h">Past 24 hours</option>
                <option value="7d">Past 7 days</option>
                <option value="30d">Past 30 days</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Sort by</span>
              <select
                value={filters.sort}
                onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as SortOrder }))}
              >
                <option value="newest">Newest first</option>
                <option value="relevance">Most relevant</option>
              </select>
            </label>
          </div>

          <div className={styles.filterFooter}>
            <div className={styles.filterOptions}>
              <label className={styles.checkOption}>
                <input
                  type="checkbox"
                  checked={filters.remoteOnly}
                  onChange={(event) => setFilters((current) => ({ ...current, remoteOnly: event.target.checked }))}
                />
                <span>Remote only</span>
              </label>
              <label className={styles.checkOption} title="Matches listings that mention sponsorship; confirm eligibility with the employer.">
                <input
                  type="checkbox"
                  checked={filters.visaSponsorshipOnly}
                  onChange={(event) => setFilters((current) => ({ ...current, visaSponsorshipOnly: event.target.checked }))}
                />
                <span>Visa sponsorship</span>
              </label>
              <label className={styles.pageSizeOption}>
                <span>Per page</span>
                <select
                  value={filters.pageSize}
                  onChange={(event) => setFilters((current) => ({ ...current, pageSize: Number(event.target.value) }))}
                  aria-label="Jobs per page"
                >
                  {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.filterActions}>
              <button type="button" className={styles.clearButton} onClick={() => { setFilters(DEFAULT_FILTERS); void loadJobs(DEFAULT_FILTERS, 1); }}>
                Clear filters
              </button>
              <button type="submit" className={styles.searchButton} disabled={loading}>
                {loading ? <LoaderCircle size={17} className={styles.spinning} /> : <Search size={17} />}
                {loading ? 'Searching' : 'Search jobs'}
              </button>
            </div>
          </div>
        </form>
      </Card>

      {response && (
        <section className={styles.resultsSection} aria-live="polite">
          <div className={styles.resultsHeader}>
            <div>
              <span className={styles.resultsKicker}>LIVE JOB MARKET</span>
              <h2>
                {feedNotReady
                  ? waitingForSync ? 'Jobs are syncing' : 'Job feeds unavailable'
                  : `${pagination?.total ?? 0} open ${pagination?.total === 1 ? 'role' : 'roles'}`}
              </h2>
              <p>
                {feedNotReady
                  ? waitingForSync
                    ? 'The first feed refresh is underway. Check back shortly.'
                    : 'The job feed could not be refreshed. The API will retry automatically.'
                  : `Showing ${startResult}–${endResult}${pagination?.total ? ` of ${pagination.total}` : ''}`}
              </p>
            </div>
            <div className={styles.sortSummary}><ArrowDownUp size={15} /> {filters.sort === 'newest' ? 'Newest first' : 'Most relevant'}</div>
          </div>

          {response.sources.length > 0 && (
            <div className={styles.sourcesBar} aria-label="Job source status">
              <span className={styles.sourcesLabel}>FEEDS</span>
              {response.sources.map((source) => (
                <span className={`${styles.sourceStatus} ${styles[`status_${source.availability}`]}`} key={`${source.source}:${source.sourceBoard}`} title={source.lastSuccessAt ? `Last successful update ${relativeTime(source.lastSuccessAt)}` : 'No successful sync yet'}>
                  <i /> {source.name} <b>{availabilityLabel(source.availability)}</b>
                </span>
              ))}
            </div>
          )}

          {!feedNotReady && response.sourceErrors.map((source) => (
            <p className={styles.sourceError} role="status" key={source.name}>{source.name}: {source.error}</p>
          ))}

          {response.jobs.length === 0 && feedNotReady ? (
            <Card className={styles.errorState} role="status" hoverEffect={false}>
              <div><BriefcaseBusiness size={20} /></div>
              <section>
                <h2>{waitingForSync ? 'Waiting for the first feed sync' : 'We could not load current jobs'}</h2>
                <p>
                  {response.sourceErrors.length > 0
                    ? response.sourceErrors.map(({ name, error: sourceError }) => `${name}: ${sourceError}`).join(' · ')
                    : 'No job feeds have reported a successful refresh yet.'}
                </p>
              </section>
              <button type="button" className={styles.retryButton} onClick={() => void loadJobs(filters, 1)} disabled={loading}>
                {loading ? <LoaderCircle size={15} className={styles.spinning} /> : <Search size={15} />} Retry
              </button>
            </Card>
          ) : response.jobs.length === 0 ? (
            <Card className={styles.emptyState} hoverEffect={false}>
              <div className={styles.emptyIcon}><BriefcaseBusiness size={24} /></div>
              <h3>No roles match those filters</h3>
              <p>Try a broader location or remove a filter to see more opportunities.</p>
              <button type="button" className={styles.clearButton} onClick={() => { setFilters(DEFAULT_FILTERS); void loadJobs(DEFAULT_FILTERS, 1); }}>
                Clear filters and browse all jobs
              </button>
            </Card>
          ) : (
            <div className={styles.jobList}>
              {response.jobs.map((job, index) => {
                const saved = savedJobs.has(job.id);
                return (
                  <motion.div
                    key={job.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.28) }}
                  >
                  <Card className={styles.jobCard} hoverEffect={false}>
                    <div className={styles.jobMain}>
                      <div className={styles.companyMark} aria-hidden="true">{job.company.trim().charAt(0).toUpperCase() || 'J'}</div>
                      <div className={styles.jobDetails}>
                        <div className={styles.jobTitleRow}>
                          <div>
                            <h3>{job.title}</h3>
                            <p className={styles.companyName}>{job.company}</p>
                          </div>
                          {job.remote && <span className={styles.remoteBadge}>Remote friendly</span>}
                          {job.visaSponsorshipLikely && <span className={styles.sponsorshipBadge}>Visa sponsorship mentioned</span>}
                        </div>
                        <div className={styles.jobMeta}>
                          <span><MapPin size={14} /> {job.location}</span>
                          <span><Clock3 size={14} /> {relativeTime(job.postedAt)}</span>
                          {job.salary && <span>{job.salary}</span>}
                          {job.employmentType && <span>{job.employmentType}</span>}
                          <span className={styles.providerTag}>{job.source}</span>
                        </div>
                        {job.description && <p className={styles.description}>{job.description}</p>}
                        {job.tags.length > 0 && <div className={styles.tags}>{job.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>}
                      </div>
                    </div>
                    <div className={styles.jobActions}>
                      <button
                        type="button"
                        className={saved ? styles.savedButton : styles.saveButton}
                        disabled={saved || createApplication.isPending}
                        onClick={() => void saveJob(job)}
                      >
                        {saved ? <Check size={15} /> : <BookmarkPlus size={15} />}
                        {saved ? 'In tracker' : 'Save'}
                      </button>
                      <a className={styles.originalLink} href={job.url} target="_blank" rel="noopener noreferrer">
                        View job <ArrowUpRight size={15} />
                      </a>
                    </div>
                  </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Job search pages">
              <button type="button" onClick={() => void loadJobs(appliedFilters, currentPage - 1)} disabled={loading || currentPage <= 1}>
                <ChevronLeft size={17} /> Previous
              </button>
              <span>Page <b>{currentPage}</b> of <b>{pagination.totalPages}</b></span>
              <button type="button" onClick={() => void loadJobs(appliedFilters, currentPage + 1)} disabled={loading || currentPage >= pagination.totalPages}>
                Next <ChevronRight size={17} />
              </button>
            </nav>
          )}

          {response.sources.length > 0 && (
            <p className={styles.attribution}>
              Listings link to their original postings. Sources: {response.sources.map((source, index) => (
                <span key={`${source.source}:${source.sourceBoard}`}>
                  {index > 0 ? ' · ' : ''}<a href={source.attributionUrl} target="_blank" rel="noopener noreferrer">{source.name}</a>
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      {error && (
        <Card className={styles.errorState} role="alert" hoverEffect={false}>
          <div><BriefcaseBusiness size={20} /></div>
          <section><h2>Job listings aren&apos;t available yet</h2><p>{error}</p></section>
          <button type="button" className={styles.retryButton} onClick={() => void loadJobs(filters, 1)} disabled={loading}>
            {loading ? <LoaderCircle size={15} className={styles.spinning} /> : <Search size={15} />} Retry
          </button>
        </Card>
      )}

      {!response && !error && loading && (
        <div className={styles.loadingState} role="status"><LoaderCircle size={20} className={styles.spinning} /> Loading the latest catalogue…</div>
      )}

      <p className={styles.searchNote}>
        <BriefcaseBusiness size={14} /> Listings refresh automatically from public job-board feeds. Always check the employer&apos;s original posting for current details.
        <Link href="/extension">Save jobs from other sites with the JobIN extension <ArrowUpRight size={13} /></Link>
      </p>
    </div>
  );
}
