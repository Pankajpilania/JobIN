'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, BriefcaseBusiness, LoaderCircle, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SearchJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  salary?: string;
  postedAt?: string;
  source: string;
}

interface SearchResponse {
  jobs: SearchJob[];
  sources: Array<{ name: string; attributionUrl: string }>;
  sourceErrors: Array<{ name: string; error: string }>;
  importSummary: { imported: number; skipped: number } | null;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface-1)',
  color: 'var(--text-1)',
  padding: '12px 14px',
  fontSize: 14,
  outline: 'none',
};

function postedLabel(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function JobSearchPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [autoImport, setAutoImport] = useState(true);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('query') ?? '');
    setLocation(params.get('location') ?? '');
    setRemoteOnly(params.get('remoteOnly') === 'true');
  }, []);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const result = await apiClient.post<SearchResponse>(
        '/job-search',
        { query, location, remoteOnly, autoImport, limit },
        token,
      );
      setResponse(result);
      if (autoImport && result.importSummary) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['applications'] }),
          queryClient.invalidateQueries({ queryKey: ['application-stats'] }),
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        ]);
        if (result.importSummary.imported || result.importSummary.skipped) {
          toast.success(
            `${result.importSummary.imported} job${result.importSummary.imported === 1 ? '' : 's'} added to your tracker` +
              (result.importSummary.skipped
                ? `; ${result.importSummary.skipped} already tracked`
                : ''),
          );
        }
      }
      if (result.sourceErrors.length) {
        toast.error(
          `One or more job sources failed: ${result.sourceErrors.map((item) => item.name).join(', ')}`,
        );
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Could not search jobs.';
      setError(message);
      setResponse(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 0 48px' }}>
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            color: 'var(--brand)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          Find your next role
        </p>
        <h1 style={{ color: 'var(--text-1)', fontSize: 30, lineHeight: 1.2, margin: 0 }}>
          Job Search
        </h1>
        <p style={{ color: 'var(--text-2)', margin: '10px 0 0', maxWidth: 700, lineHeight: 1.6 }}>
          Search public job feeds worldwide, then open the original posting or save matching roles
          to your tracker.
        </p>
      </header>

      <Card style={{ padding: 22, marginBottom: 18 }}>
        <form onSubmit={search}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 14,
            }}
          >
            <label
              style={{
                display: 'grid',
                gap: 7,
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              Keywords
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. product designer"
                maxLength={100}
                style={fieldStyle}
              />
            </label>
            <label
              style={{
                display: 'grid',
                gap: 7,
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              Location
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Any country or city"
                maxLength={100}
                style={fieldStyle}
              />
            </label>
            <label
              style={{
                display: 'grid',
                gap: 7,
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              Maximum results
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                style={fieldStyle}
              >
                {[10, 25].map((value) => (
                  <option key={value} value={value}>
                    {value} jobs
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginTop: 18,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  color: 'var(--text-2)',
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(event) => setRemoteOnly(event.target.checked)}
                />
                Remote roles only
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  color: 'var(--text-2)',
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={autoImport}
                  onChange={(event) => setAutoImport(event.target.checked)}
                />
                Add results to my tracker
              </label>
            </div>
            <Button type="submit" disabled={loading} style={{ minWidth: 170 }}>
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> Searching…
                </>
              ) : (
                <>
                  <Search size={16} /> Search jobs
                </>
              )}
            </Button>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '14px 0 0', lineHeight: 1.5 }}>
            Search is free and does not use AI. Results are limited to 25 per search and duplicate
            job links already in your tracker are skipped.
          </p>
        </form>
      </Card>

      <Card
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 16,
          marginBottom: 24,
          background: 'var(--surface-2)',
        }}
      >
        <BriefcaseBusiness size={18} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
          Search currently uses Arbeitnow and Remotive public feeds. Greenhouse and Lever provide
          employer-specific boards; administrators can configure board slugs for those sources.
          Remotive listings may be delayed by up to 24 hours. LinkedIn and Indeed are not
          server-scraped—open a listing and use the{' '}
          <Link href="/extension" style={{ color: 'var(--brand)', fontWeight: 700 }}>
            JobIN extension
          </Link>{' '}
          to save it. Remotive listings link to the original posting and are attributed to Remotive.
        </p>
      </Card>

      {error && (
        <Card style={{ padding: 18, marginBottom: 18, color: 'var(--danger, #b42318)' }}>
          {error}
        </Card>
      )}

      {response && (
        <section>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h2 style={{ color: 'var(--text-1)', fontSize: 19, margin: 0 }}>
              {response.jobs.length} job{response.jobs.length === 1 ? '' : 's'} found
            </h2>
            {response.importSummary && (
              <span style={{ color: 'var(--text-2)', fontSize: 13 }}>
                {response.importSummary.imported} added · {response.importSummary.skipped} already
                tracked
              </span>
            )}
          </div>

          {response.sourceErrors.map((source) => (
            <p key={source.name} role="status" style={{ color: 'var(--text-2)', fontSize: 13 }}>
              {source.name}: {source.error}
            </p>
          ))}

          {response.jobs.length === 0 ? (
            <Card style={{ padding: 28, textAlign: 'center', color: 'var(--text-2)' }}>
              No matching jobs found. Try fewer keywords or a broader location.
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {response.jobs.map((job) => (
                <Card key={`${job.source}:${job.id}`} style={{ padding: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 400px' }}>
                      <h3
                        style={{ color: 'var(--text-1)', fontSize: 17, margin: 0, lineHeight: 1.4 }}
                      >
                        {job.title}
                      </h3>
                      <p style={{ color: 'var(--text-2)', fontWeight: 650, margin: '5px 0 0' }}>
                        {job.company}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                          color: 'var(--text-3)',
                          fontSize: 12,
                          marginTop: 10,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <MapPin size={13} /> {job.location}
                        </span>
                        {job.remote && <span>Remote</span>}
                        {job.salary && <span>{job.salary}</span>}
                        <span>{job.source}</span>
                        {postedLabel(job.postedAt) && (
                          <span>Posted {postedLabel(job.postedAt)}</span>
                        )}
                      </div>
                      {job.description && (
                        <p
                          style={{
                            color: 'var(--text-2)',
                            fontSize: 13,
                            lineHeight: 1.6,
                            margin: '12px 0 0',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 3,
                            overflow: 'hidden',
                          }}
                        >
                          {job.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        color: 'var(--brand)',
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      View original <ArrowUpRight size={15} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 18 }}>
            Sources:{' '}
            {response.sources.map((source, index) => (
              <span key={source.name}>
                {index > 0 ? ' · ' : ''}
                <a href={source.attributionUrl} target="_blank" rel="noopener noreferrer">
                  {source.name}
                </a>
              </span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}
