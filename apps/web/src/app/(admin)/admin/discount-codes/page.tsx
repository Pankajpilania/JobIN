'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BadgePercent, Ban, ChevronLeft, ChevronRight, LoaderCircle, Plus, RefreshCw, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import styles from './discount-codes.module.css';

type DiscountDuration = 'ONCE' | 'REPEATING' | 'FOREVER';
type DiscountStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

interface DiscountCode {
  id: string;
  couponId: string;
  code: string;
  percentOff: number | null;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths: number | null;
  active: boolean;
  status: DiscountStatus;
  expiresAt: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  createdAt: string;
}

interface DiscountCodePage {
  data: DiscountCode[];
  hasMore: boolean;
  nextCursor: string | null;
}

const inputClass = styles.input;

function durationLabel(code: DiscountCode) {
  if (code.duration === 'forever') return 'For the subscription lifetime';
  if (code.duration === 'repeating') {
    return `${code.durationInMonths ?? '—'} month${code.durationInMonths === 1 ? '' : 's'}`;
  }
  return 'First invoice';
}

function statusLabel(status: DiscountStatus) {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'expired': return 'Expired';
    case 'exhausted': return 'Used up';
  }
}

function formatDate(value: string | null) {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminDiscountCodesPage() {
  const { getToken } = useAuth();
  const [page, setPage] = useState<DiscountCodePage | null>(null);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('20');
  const [duration, setDuration] = useState<DiscountDuration>('ONCE');
  const [durationInMonths, setDurationInMonths] = useState('3');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');

  const load = useCallback(async (startingAfter: string | null = null) => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again to manage discount codes.');
      const query = new URLSearchParams({ limit: '50' });
      if (startingAfter) query.set('startingAfter', startingAfter);
      setPage(await apiClient.get<DiscountCodePage>(`/admin/discount-codes?${query}`, token));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load discount codes.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const createCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(percentOff);
    const months = Number(durationInMonths);
    const limit = maxRedemptions ? Number(maxRedemptions) : undefined;
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      toast.error('Choose a whole-number discount between 1% and 100%.');
      return;
    }
    if (duration === 'REPEATING' && (!Number.isInteger(months) || months < 1)) {
      toast.error('Enter at least one month for a repeating discount.');
      return;
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      toast.error('The redemption limit must be a positive whole number.');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again.');
      await apiClient.post('/admin/discount-codes', {
        code: code.trim().toUpperCase(),
        percentOff: amount,
        duration,
        ...(duration === 'REPEATING' ? { durationInMonths: months } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        ...(limit !== undefined ? { maxRedemptions: limit } : {}),
      }, token);
      toast.success(`${code.trim().toUpperCase()} is ready to use.`);
      setCode('');
      setPercentOff('20');
      setDuration('ONCE');
      setDurationInMonths('3');
      setExpiresAt('');
      setMaxRedemptions('');
      setPageCursors([null]);
      setPageIndex(0);
      await load(null);
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Could not create the code.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (discountCode: DiscountCode) => {
    if (!window.confirm(`Stop new customers from using ${discountCode.code}? Existing subscriptions keep their discount.`)) return;
    setDeactivatingId(discountCode.id);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again.');
      await apiClient.patch(
        `/admin/discount-codes/${encodeURIComponent(discountCode.id)}/deactivate`,
        {},
        token,
      );
      toast.success(`${discountCode.code} has been deactivated.`);
      await load(pageCursors[pageIndex] ?? null);
    } catch (deactivateError) {
      toast.error(deactivateError instanceof Error ? deactivateError.message : 'Could not deactivate this code.');
    } finally {
      setDeactivatingId(null);
    }
  };

  const goNext = () => {
    if (!page?.nextCursor) return;
    const nextIndex = pageIndex + 1;
    const nextCursors = [...pageCursors.slice(0, nextIndex), page.nextCursor];
    setPageCursors(nextCursors);
    setPageIndex(nextIndex);
    void load(page.nextCursor);
  };

  const goPrevious = () => {
    if (pageIndex === 0) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    void load(pageCursors[previousIndex] ?? null);
  };

  const rows = page?.data ?? [];
  const activeCount = rows.filter((item) => item.status === 'active').length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}><Tag size={14} /> BILLING TOOLS</span>
          <h1>Discount codes</h1>
          <p>Create public offers for any customer. Stripe applies the code and calculates the amount due at checkout.</p>
        </div>
        <Button variant="ghost" onClick={() => void load(pageCursors[pageIndex] ?? null)} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </Button>
      </header>

      <div className={styles.summaryGrid}>
        <Card hoverEffect={false} className={styles.summaryCard}>
          <span>Codes on this page</span><strong>{page?.data.length ?? '—'}</strong>
        </Card>
        <Card hoverEffect={false} className={styles.summaryCard}>
          <span>Available on this page</span><strong>{page ? activeCount : '—'}</strong>
        </Card>
        <Card hoverEffect={false} className={styles.summaryCard}>
          <span>Audience</span><strong>Everyone</strong>
        </Card>
      </div>

      <Card hoverEffect={false} className={styles.formCard}>
        <div className={styles.sectionHeading}>
          <div className={styles.iconTile}><BadgePercent size={18} /></div>
          <div><h2>Create a discount code</h2><p>Customers enter the code on Stripe Checkout.</p></div>
        </div>
        <form onSubmit={(event) => void createCode(event)} className={styles.form}>
          <label className={styles.field}>
            <span>Code</span>
            <input className={inputClass} required minLength={3} maxLength={40} pattern="[A-Za-z0-9-]+" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WELCOME20" autoComplete="off" />
            <small>3–40 letters, numbers, or hyphens. Codes are available to all customers.</small>
          </label>
          <label className={styles.field}>
            <span>Discount</span>
            <div className={styles.percentField}>
              <input className={inputClass} type="number" required min={1} max={100} step={1} value={percentOff} onChange={(event) => setPercentOff(event.target.value)} />
              <b>% off</b>
            </div>
          </label>
          <label className={styles.field}>
            <span>Discount duration</span>
            <select className={inputClass} value={duration} onChange={(event) => setDuration(event.target.value as DiscountDuration)}>
              <option value="ONCE">First invoice</option>
              <option value="REPEATING">Number of months</option>
              <option value="FOREVER">For subscription lifetime</option>
            </select>
          </label>
          {duration === 'REPEATING' && (
            <label className={styles.field}>
              <span>Number of months</span>
              <input className={inputClass} type="number" required min={1} step={1} value={durationInMonths} onChange={(event) => setDurationInMonths(event.target.value)} />
            </label>
          )}
          <label className={styles.field}>
            <span>Valid until <em>Optional</em></span>
            <input className={inputClass} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            <small>After this time, new checkouts can’t redeem the code.</small>
          </label>
          <label className={styles.field}>
            <span>Total uses <em>Optional</em></span>
            <input className={inputClass} type="number" min={1} step={1} value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} placeholder="Unlimited" />
            <small>Shared across all customers.</small>
          </label>
          <div className={styles.formFooter}>
            <p><BadgePercent size={15} /> 100% off means no amount is due for the discounted invoice.</p>
            <Button type="submit" disabled={saving || !code.trim()}>
              {saving ? <LoaderCircle size={16} className={styles.spin} /> : <Plus size={16} />}
              {saving ? 'Creating…' : 'Create code'}
            </Button>
          </div>
        </form>
      </Card>

      <Card hoverEffect={false} className={styles.listCard}>
        <div className={styles.listHeader}>
          <div><h2>Created codes</h2><p>Deactivate a code to stop new redemptions. Existing subscriptions keep their discount.</p></div>
          <span className={styles.pageLabel}>Page {pageIndex + 1}</span>
        </div>
        {error ? (
          <div className={styles.errorState} role="alert">
            <p>{error}</p>
            <Button variant="ghost" onClick={() => void load(pageCursors[pageIndex] ?? null)}>Try again</Button>
          </div>
        ) : loading && !page ? (
          <div className={styles.loading}><LoaderCircle size={20} className={styles.spin} /> Loading discount codes…</div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}><BadgePercent size={24} /><strong>No discount codes yet</strong><span>Create your first offer above.</span></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Valid until</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((discountCode) => (
                  <tr key={discountCode.id}>
                    <td><strong className={styles.code}>{discountCode.code}</strong><small>{durationLabel(discountCode)}</small></td>
                    <td><strong>{discountCode.percentOff ?? '—'}%</strong></td>
                    <td>{discountCode.timesRedeemed}{discountCode.maxRedemptions ? ` / ${discountCode.maxRedemptions}` : ' / ∞'}</td>
                    <td>{formatDate(discountCode.expiresAt)}</td>
                    <td><span className={`${styles.status} ${styles[`status_${discountCode.status}`]}`}>{statusLabel(discountCode.status)}</span></td>
                    <td className={styles.actionCell}>
                      {discountCode.status === 'active' && (
                        <button type="button" className={styles.deactivateButton} disabled={deactivatingId === discountCode.id} onClick={() => void deactivate(discountCode)}>
                          {deactivatingId === discountCode.id ? <LoaderCircle size={14} className={styles.spin} /> : <Ban size={14} />}
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.pagination}>
          <button type="button" onClick={goPrevious} disabled={loading || pageIndex === 0}><ChevronLeft size={16} /> Previous</button>
          <span>{page?.hasMore ? 'More codes available' : 'End of list'}</span>
          <button type="button" onClick={goNext} disabled={loading || !page?.hasMore || !page.nextCursor}>Next <ChevronRight size={16} /></button>
        </div>
      </Card>
    </div>
  );
}
