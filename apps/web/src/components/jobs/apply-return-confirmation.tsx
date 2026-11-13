'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateApplication } from '@/hooks/use-applications';

export const PENDING_APPLY_KEY = 'jobin:pending-apply:v1';

export interface PendingApply {
  title: string;
  company: string;
  location?: string;
  url: string;
  description?: string;
  salary?: string;
  source: string;
  createdAt: number;
}

const MAX_PENDING_AGE_MS = 24 * 60 * 60 * 1000;

function isPendingApply(value: unknown): value is PendingApply {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<PendingApply>;
  if (
    typeof job.title !== 'string' || job.title.length > 200 ||
    typeof job.company !== 'string' || job.company.length > 200 ||
    typeof job.url !== 'string' || job.url.length > 2048 ||
    typeof job.source !== 'string' || job.source.length > 100 ||
    typeof job.createdAt !== 'number' || !Number.isFinite(job.createdAt)
  ) return false;
  try {
    const url = new URL(job.url);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function ApplyReturnConfirmation() {
  const createApplication = useCreateApplication();
  const [pending, setPending] = useState<PendingApply | null>(null);

  const readPending = useCallback(() => {
    const raw = window.sessionStorage.getItem(PENDING_APPLY_KEY);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPendingApply(parsed) || Date.now() - parsed.createdAt > MAX_PENDING_AGE_MS) {
        window.sessionStorage.removeItem(PENDING_APPLY_KEY);
        return;
      }
      setPending(parsed);
    } catch {
      window.sessionStorage.removeItem(PENDING_APPLY_KEY);
    }
  }, []);

  useEffect(() => {
    readPending();
    const onFocus = () => window.setTimeout(readPending, 450);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') readPending();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [readPending]);

  const dismiss = () => {
    window.sessionStorage.removeItem(PENDING_APPLY_KEY);
    setPending(null);
    toast('This job wasn’t added to your tracker.');
  };

  const confirmApplied = async () => {
    if (!pending) return;
    try {
      await createApplication.mutateAsync({
        jobTitle: pending.title,
        companyName: pending.company,
        location: pending.location,
        jobUrl: pending.url,
        jobDescription: pending.description,
        salary: pending.salary,
        source: pending.source,
        status: 'APPLIED',
        appliedDate: new Date().toISOString(),
      });
      window.sessionStorage.removeItem(PENDING_APPLY_KEY);
      setPending(null);
      toast.success('Application added to your tracker.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add this application. Please try again.');
    }
  };

  if (!pending) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center',
        padding: 18, background: 'rgba(8, 20, 14, .52)', backdropFilter: 'blur(5px)',
      }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-return-title"
        style={{
          position: 'relative', width: 'min(100%, 470px)', overflow: 'hidden', padding: '30px 28px 26px',
          border: '1px solid rgba(255,255,255,.78)', borderRadius: 22,
          background: 'linear-gradient(150deg, #ffffff 0%, #f2fff6 100%)',
          color: '#14251c', boxShadow: '0 26px 80px rgba(0,0,0,.24)',
        }}
      >
        <button
          type="button" aria-label="Close and skip tracking" onClick={dismiss}
          style={{ position: 'absolute', top: 15, right: 15, display: 'grid', width: 34, height: 34, placeItems: 'center', border: '1px solid #e1ebe4', borderRadius: 10, background: '#fff', color: '#51645a', cursor: 'pointer' }}
        ><X size={17} /></button>
        <div style={{ display: 'grid', width: 52, height: 52, placeItems: 'center', borderRadius: 16, background: '#dcfce9', color: '#087d59' }}>
          <ExternalLink size={22} />
        </div>
        <p style={{ margin: '20px 0 6px', color: '#087d59', fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Your application journey
        </p>
        <h2 id="apply-return-title" style={{ margin: 0, fontSize: 26, letterSpacing: '-.04em', lineHeight: 1.15 }}>
          Did you apply?
        </h2>
        <p style={{ margin: '10px 0 0', color: '#5e7066', fontSize: 14, lineHeight: 1.6 }}>
          Tell us if you submitted an application. We’ll keep your tracker accurate.
        </p>
        <div style={{ display: 'grid', gap: 4, marginTop: 20, padding: 15, border: '1px solid #dcebe1', borderRadius: 14, background: 'rgba(255,255,255,.8)' }}>
          <strong style={{ fontSize: 15 }}>{pending.title}</strong>
          <span style={{ color: '#53675b', fontSize: 13 }}>{pending.company}{pending.location ? ` · ${pending.location}` : ''}</span>
          <a href={pending.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, width: 'fit-content', marginTop: 5, color: '#087d59', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Reopen job posting <ExternalLink size={13} />
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 10, marginTop: 20 }}>
          <button
            type="button" onClick={dismiss} disabled={createApplication.isPending}
            style={{ minHeight: 46, padding: '10px 13px', border: '1px solid #d7e3dc', borderRadius: 12, background: '#fff', color: '#34473c', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >Not yet</button>
          <button
            type="button" onClick={() => void confirmApplied()} disabled={createApplication.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, padding: '10px 14px', border: 0, borderRadius: 12, background: '#087d59', color: '#fff', fontSize: 13, fontWeight: 750, cursor: createApplication.isPending ? 'wait' : 'pointer', opacity: createApplication.isPending ? .7 : 1 }}
          >
            <Check size={16} /> {createApplication.isPending ? 'Adding…' : 'Yes, I applied'}
          </button>
        </div>
        <p style={{ margin: '12px 0 0', color: '#728177', fontSize: 11, lineHeight: 1.5, textAlign: 'center' }}>
          Nothing is added unless you confirm.
        </p>
      </section>
    </div>
  );
}
