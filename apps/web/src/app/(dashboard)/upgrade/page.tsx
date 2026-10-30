'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

type PlanCode = 'PREMIUM' | 'PRO';
type CurrencyCode = 'INR' | 'GBP';
type BillingInterval = 'MONTHLY' | 'YEARLY';
type PriceAvailability = Record<PlanCode, Record<BillingInterval, boolean>>;

interface CheckoutOptions {
  currencies: CurrencyCode[];
  stripeCheckout: Partial<Record<CurrencyCode, PriceAvailability>>;
}

const PLANS: Array<{ code: PlanCode; name: string; description: string }> = [
  { code: 'PREMIUM', name: 'Pro', description: 'More room for your job search.' },
  { code: 'PRO', name: 'Pro Max', description: 'Maximum tools and priority AI.' },
];

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const [plan, setPlan] = useState<PlanCode>(searchParams.get('plan') === 'PRO' ? 'PRO' : 'PREMIUM');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient
      .get<CheckoutOptions>('/billing/checkout-options')
      .then((options) => {
        if (!active) return;
        setCheckoutOptions(options);
        setCurrency((current) =>
          options.currencies.includes(current) ? current : (options.currencies[0] ?? current),
        );
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : 'Could not load Stripe plans.');
        }
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const availableCurrencies = checkoutOptions?.currencies ?? [];
  const stripeCheckout = checkoutOptions?.stripeCheckout[currency]?.[plan];
  const stripeCheckoutAvailable = stripeCheckout?.[billingInterval] ?? false;
  const checkoutStatus = searchParams.get('checkout');
  const hasConfiguredPrices = useMemo(
    () =>
      Object.values(checkoutOptions?.stripeCheckout ?? {}).some((currencyPrices) =>
        Object.values(currencyPrices ?? {}).some((intervals) =>
          Object.values(intervals ?? {}).some(Boolean),
        ),
      ),
    [checkoutOptions],
  );

  const startStripeCheckout = async () => {
    if (!stripeCheckoutAvailable) {
      toast.error('This plan and billing interval are not configured for Stripe yet.');
      return;
    }
    if (!isSignedIn) {
      router.push('/auth/login?next=%2Fupgrade');
      return;
    }
    setCheckoutLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const result = await apiClient.post<{ url: string }>(
        '/billing/create-checkout-session',
        { plan, currency, interval: billingInterval },
        token,
      );
      if (!result.url) throw new Error('Stripe did not return a checkout link.');
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Stripe Checkout.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, color: 'var(--text-1)', fontSize: 30 }}>Choose your plan</h1>
        <p style={{ color: 'var(--text-2)' }}>
          Pay securely with Stripe. Your plan activates after Stripe confirms your payment.
        </p>
      </header>

      {checkoutStatus === 'success' && (
        <Card hoverEffect={false} style={{ padding: 18 }}>
          <strong style={{ color: 'var(--text-1)' }}>Payment received</strong>
          <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>
            Stripe is confirming your subscription. Your plan will appear here as soon as the
            confirmation is processed.
          </p>
        </Card>
      )}
      {checkoutStatus === 'cancelled' && (
        <Card hoverEffect={false} style={{ padding: 18 }}>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            Checkout was cancelled. No payment was completed.
          </p>
        </Card>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16,
        }}
      >
        {PLANS.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => setPlan(item.code)}
            aria-pressed={plan === item.code}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              border: `2px solid ${plan === item.code ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 12,
              background: 'var(--surface)',
              padding: 20,
              color: 'var(--text-1)',
            }}
          >
            <strong style={{ fontSize: 20 }}>{item.name}</strong>
            <p style={{ color: 'var(--text-2)' }}>{item.description}</p>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
              Price shown securely at Stripe checkout
            </span>
          </button>
        ))}
      </div>

      <Card hoverEffect={false} style={{ padding: 24, display: 'grid', gap: 18 }}>
        <div>
          <h2 style={{ marginTop: 0, color: 'var(--text-1)' }}>Currency</h2>
          {availableCurrencies.length ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {availableCurrencies.map((item) => (
                <Button
                  key={item}
                  variant={currency === item ? 'primary' : 'ghost'}
                  onClick={() => setCurrency(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-3)' }}>
              {settingsLoading
                ? 'Loading Stripe prices…'
                : 'No Stripe prices are configured yet. Please contact support.'}
            </p>
          )}
        </div>

        <div>
          <h2 style={{ marginTop: 0, color: 'var(--text-1)' }}>Billing interval</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['MONTHLY', 'YEARLY'] as BillingInterval[]).map((interval) => (
              <Button
                key={interval}
                variant={billingInterval === interval ? 'primary' : 'ghost'}
                onClick={() => setBillingInterval(interval)}
                disabled={!stripeCheckout?.[interval]}
              >
                {interval === 'MONTHLY' ? 'Monthly' : 'Yearly'}
              </Button>
            ))}
          </div>
        </div>

        {hasConfiguredPrices ? (
          <p style={{ color: 'var(--text-2)', margin: 0 }}>
            Stripe securely processes {plan === 'PREMIUM' ? 'Pro' : 'Pro Max'} in {currency} (
            {billingInterval.toLowerCase()}). Subscription access begins after Stripe confirms
            payment.
          </p>
        ) : !settingsLoading ? (
          <p style={{ color: 'var(--text-3)', margin: 0 }}>
            Stripe prices have not been set up yet. Please contact support.
          </p>
        ) : null}

        <Button
          onClick={startStripeCheckout}
          disabled={checkoutLoading || settingsLoading || !stripeCheckoutAvailable}
        >
          {checkoutLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          {checkoutLoading
            ? 'Opening Stripe…'
            : stripeCheckoutAvailable
              ? isSignedIn
                ? 'Continue to Stripe Checkout'
                : 'Sign in to continue'
              : 'Price not configured'}
        </Button>
      </Card>
    </div>
  );
}
