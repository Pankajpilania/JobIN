'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Currency = 'INR' | 'GBP';
type PlanCode = 'PREMIUM' | 'PRO';
type Interval = 'MONTHLY' | 'YEARLY';

interface StripePrice {
  plan: PlanCode;
  currency: Currency;
  interval: Interval;
  stripePriceId: string;
}

const CURRENCIES: Currency[] = ['INR', 'GBP'];
const PLANS: PlanCode[] = ['PREMIUM', 'PRO'];
const INTERVALS: Interval[] = ['MONTHLY', 'YEARLY'];
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  background: 'var(--surface)',
  color: 'var(--text-1)',
  fontSize: 14,
};

function emptyStripePrices(): StripePrice[] {
  return PLANS.flatMap((plan) =>
    CURRENCIES.flatMap((currency) =>
      INTERVALS.map((interval) => ({ plan, currency, interval, stripePriceId: '' })),
    ),
  );
}

export default function AdminPaymentSettingsPage() {
  const { getToken } = useAuth();
  const [stripePrices, setStripePrices] = useState<StripePrice[]>(emptyStripePrices);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again to load Stripe price settings.');
      const configuredPrices = await apiClient.get<Array<StripePrice & { id: string }>>(
        '/admin/stripe-prices',
        token,
      );
      const configuredByKey = new Map(
        configuredPrices.map((price) => [
          `${price.plan}:${price.currency}:${price.interval}`,
          price.stripePriceId,
        ]),
      );
      setStripePrices(
        emptyStripePrices().map((price) => ({
          ...price,
          stripePriceId:
            configuredByKey.get(`${price.plan}:${price.currency}:${price.interval}`) ?? '',
        })),
      );
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Could not load Stripe price settings.',
      );
      toast.error(error instanceof Error ? error.message : 'Could not load Stripe price settings.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStripePrices = async () => {
    const token = await getToken();
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/stripe-prices', { prices: stripePrices }, token);
      toast.success('Stripe Checkout prices saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Stripe prices.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card hoverEffect={false}>Loading Stripe settings…</Card>;
  if (loadError) {
    return (
      <Card hoverEffect={false}>
        <p role="alert">{loadError} Existing Stripe prices were not changed.</p>
        <Button onClick={() => void load()}>Retry</Button>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Stripe payment settings</h1>
        <p style={{ color: 'var(--text-2)' }}>
          Configure Stripe recurring Price IDs for each plan, currency, and interval. Manage keys,
          payouts, refunds, and disputes in the Stripe Dashboard; never enter secret keys here.
        </p>
      </header>

      <Card hoverEffect={false} style={{ display: 'grid', gap: 14 }}>
        {stripePrices.map((price, index) => (
          <label
            key={`${price.plan}-${price.currency}-${price.interval}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr 2fr',
              alignItems: 'center',
              gap: 10,
              color: 'var(--text-2)',
              fontSize: 13,
            }}
          >
            <span>{price.plan === 'PREMIUM' ? 'Pro' : 'Pro Max'}</span>
            <span>{price.currency}</span>
            <span>{price.interval.toLowerCase()}</span>
            <input
              style={inputStyle}
              placeholder="price_…"
              maxLength={100}
              value={price.stripePriceId}
              onChange={(event) => {
                setStripePrices((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, stripePriceId: event.target.value.trim() }
                      : item,
                  ),
                );
              }}
            />
          </label>
        ))}
        <Button disabled={saving || Boolean(loadError)} onClick={() => void saveStripePrices()}>
          {saving ? 'Saving…' : 'Save Stripe prices'}
        </Button>
      </Card>
    </div>
  );
}
