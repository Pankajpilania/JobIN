'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

type PlanCode = 'PREMIUM' | 'PRO';
type CurrencyCode = 'GBP' | 'INR';
type BillingInterval = 'MONTHLY' | 'YEARLY';
type PriceAvailability = Record<PlanCode, Record<BillingInterval, boolean>>;

interface CheckoutOptions {
  currencies: CurrencyCode[];
  stripeCheckout: Partial<Record<CurrencyCode, PriceAvailability>>;
  prices?: Array<{
    plan: PlanCode;
    currency: CurrencyCode;
    interval: BillingInterval;
    unitAmount: number;
  }>;
}

const PLANS: Array<{
  code: PlanCode;
  name: string;
  tagline: string;
  credits: string;
  resumes: string;
  applications: string;
  accent: string;
}> = [
  {
    code: 'PREMIUM',
    name: 'Pro',
    tagline: 'More room to make your next move.',
    credits: '100 / month',
    resumes: '10',
    applications: '200',
    accent: '#008c60',
  },
  {
    code: 'PRO',
    name: 'Pro Max',
    tagline: 'More capacity for a focused job search.',
    credits: '500 / month',
    resumes: '50',
    applications: 'Unlimited',
    accent: '#007f57',
  },
];

const CURRENCIES: CurrencyCode[] = ['GBP', 'INR'];
const INTERVALS: BillingInterval[] = ['MONTHLY', 'YEARLY'];
const FEATURE_ROWS = [
  { label: 'AI credits', free: '20 / month', premium: '100 / month', pro: '500 / month' },
  { label: 'Resume uploads', free: '2', premium: '10', pro: '50' },
  { label: 'Tracked applications', free: '25', premium: '200', pro: 'Unlimited' },
];

function currencyName(currency: CurrencyCode) {
  return currency === 'GBP' ? 'British pounds (GBP)' : 'Indian rupees (INR)';
}

function formatPrice(unitAmount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(unitAmount / 100);
}

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const [plan, setPlan] = useState<PlanCode>(
    searchParams.get('plan') === 'PRO' ? 'PRO' : 'PREMIUM',
  );
  const [currency, setCurrency] = useState<CurrencyCode>('GBP');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient
      .get<CheckoutOptions>('/billing/checkout-options')
      .then((options) => {
        if (!active) return;
        setCheckoutOptions(options);
        setOptionsError('');
        setCurrency((current) => {
          if (options.currencies.includes(current)) return current;
          if (options.currencies.includes('GBP')) return 'GBP';
          return options.currencies[0] ?? current;
        });
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : 'Could not load Stripe plans.';
          setOptionsError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stripeCheckout = checkoutOptions?.stripeCheckout[currency]?.[plan];
  const stripeCheckoutAvailable = stripeCheckout?.[billingInterval] ?? false;
  const currencyAvailable = checkoutOptions?.currencies.includes(currency) ?? false;
  const checkoutStatus = searchParams.get('checkout');
  const selectedPlan = PLANS.find((item) => item.code === plan) ?? PLANS[0];
  const selectedPrice = checkoutOptions?.prices?.find(
    (price) =>
      price.plan === plan && price.currency === currency && price.interval === billingInterval,
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

  const cardStyle = (selected: boolean, accent: string): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    minHeight: 178,
    padding: 22,
    borderRadius: 16,
    border: `1.5px solid ${selected ? accent : 'var(--border)'}`,
    background: selected ? 'linear-gradient(145deg, #fff 50%, #f3ffef 100%)' : 'var(--surface)',
    color: 'var(--text-1)',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: selected ? '0 12px 30px rgba(0, 127, 87, .1)' : 'var(--shadow-sm)',
    transition: 'transform .16s ease, box-shadow .16s ease, border-color .16s ease',
  });

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gap: 24, paddingBottom: 36 }}>
      <header
        style={{
          padding: '30px clamp(20px, 4vw, 42px)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          background:
            'radial-gradient(ellipse at 85% 0%, rgba(0,217,145,.15), transparent 40%), var(--surface)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginBottom: 12,
            color: 'var(--brand-dark)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          <Sparkles size={15} /> JobIN plans
        </div>
        <h1
          style={{
            margin: 0,
            color: 'var(--text-1)',
            fontSize: 'clamp(30px, 4vw, 42px)',
            lineHeight: 1.12,
            letterSpacing: '-.04em',
          }}
        >
          Make your next move with confidence.
        </h1>
        <p style={{ maxWidth: 660, margin: '12px 0 0', color: 'var(--text-2)', lineHeight: 1.7 }}>
          Choose a plan that fits your search. Compare what is included, select your currency, and
          review the full recurring price securely in Stripe before paying.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 18,
            color: 'var(--text-3)',
            fontSize: 12,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={15} color="var(--brand-dark)" /> Secure Stripe checkout
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} color="var(--brand-dark)" /> No charge until you confirm
          </span>
        </div>
      </header>

      {checkoutStatus === 'success' && (
        <div
          role="status"
          style={{
            padding: 18,
            border: '1px solid #9de3bd',
            borderRadius: 12,
            background: '#f0fff6',
            color: 'var(--text-1)',
          }}
        >
          <strong>Payment received</strong>
          <p style={{ color: 'var(--text-2)', margin: '5px 0 0' }}>
            Stripe is confirming your subscription. Your plan will appear as soon as confirmation is
            processed.
          </p>
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div
          role="status"
          style={{
            padding: 16,
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--surface)',
            color: 'var(--text-2)',
          }}
        >
          Checkout was cancelled. No payment was completed.
        </div>
      )}

      <section aria-labelledby="plan-heading" style={{ display: 'grid', gap: 14 }}>
        <div>
          <h2 id="plan-heading" style={{ margin: 0, color: 'var(--text-1)', fontSize: 22 }}>
            Choose your plan
          </h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
            Upgrade or compare plans at any time.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 16,
          }}
        >
          {PLANS.map((item) => {
            const selected = plan === item.code;
            const price = checkoutOptions?.prices?.find(
              (option) =>
                option.plan === item.code &&
                option.currency === currency &&
                option.interval === billingInterval,
            );
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setPlan(item.code)}
                aria-pressed={selected}
                style={cardStyle(selected, item.accent)}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Crown size={19} color={item.accent} />
                    <strong style={{ fontSize: 21 }}>{item.name}</strong>
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      border: `1px solid ${selected ? item.accent : 'var(--border)'}`,
                      background: selected ? item.accent : 'transparent',
                      color: '#fff',
                    }}
                  >
                    {selected && <Check size={13} strokeWidth={3} />}
                  </span>
                </span>
                <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{item.tagline}</span>
                <span style={{ display: 'grid', gap: 2 }}>
                  <strong style={{ color: 'var(--text-1)', fontSize: 20 }}>
                    {settingsLoading
                      ? 'Loading price…'
                      : price
                        ? formatPrice(price.unitAmount, currency)
                        : 'Price not configured'}
                  </strong>
                  {price && (
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      per {billingInterval === 'MONTHLY' ? 'month' : 'year'}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginTop: 'auto',
                    paddingTop: 8,
                  }}
                >
                  {[
                    ['AI credits', item.credits],
                    ['Resumes', item.resumes],
                    ['Applications', item.applications],
                  ].map(([label, value]) => (
                    <span
                      key={label}
                      style={{
                        display: 'grid',
                        gap: 3,
                        padding: '9px 10px',
                        borderRadius: 9,
                        background: 'var(--surface-2)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-1)', fontSize: 13 }}>{value}</strong>
                      <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{label}</span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Subscription checkout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, .8fr)',
          gap: 0,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 18,
          background: 'rgba(255, 255, 255, 0.84)',
          boxShadow: 'var(--shadow-card)',
          backdropFilter: 'blur(20px) saturate(1.25)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.25)',
        }}
      >
        <div style={{ display: 'grid', gap: 20, padding: 'clamp(20px, 4vw, 32px)' }}>
          <div>
            <p
              style={{
                margin: '0 0 5px',
                color: 'var(--brand-dark)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              Secure checkout
            </p>
            <h2 style={{ margin: 0, color: 'var(--text-1)', fontSize: 24 }}>
              {selectedPlan.name}
              <span style={{ color: 'var(--text-3)', fontSize: 15, fontWeight: 500 }}>
                {' '}
                · {billingInterval === 'MONTHLY' ? 'Monthly' : 'Yearly'}
              </span>
            </h2>
            {selectedPrice && (
              <p style={{ margin: '8px 0 0', color: 'var(--text-1)', fontSize: 22, fontWeight: 800 }}>
                {formatPrice(selectedPrice.unitAmount, currency)}
                <span style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 500 }}>
                  {' '}
                  per {billingInterval === 'MONTHLY' ? 'month' : 'year'}
                </span>
              </p>
            )}
            <p style={{ margin: '7px 0 0', color: 'var(--text-2)', fontSize: 13 }}>
              Review your price here. Stripe will show the renewal date and terms before you confirm.
            </p>
          </div>

          <div>
            <h3 style={{ margin: '0 0 10px', color: 'var(--text-1)', fontSize: 14 }}>
              Billing currency
            </h3>
            <div
              role="group"
              aria-label="Billing currency"
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                gap: 5,
                padding: 4,
                border: '1px solid var(--border)',
                borderRadius: 11,
                background: 'var(--surface-2)',
              }}
            >
              {CURRENCIES.map((item) => {
                const available = checkoutOptions?.currencies.includes(item) ?? false;
                const selected = currency === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${currencyName(item)}${available ? '' : ', prices not configured'}`}
                    onClick={() => setCurrency(item)}
                    disabled={settingsLoading}
                    style={{
                      minWidth: 100,
                      padding: '9px 14px',
                      border: selected ? '1px solid #b5ebd2' : '1px solid transparent',
                      borderRadius: 8,
                      background: selected ? 'var(--surface)' : 'transparent',
                      color: selected ? 'var(--text-1)' : 'var(--text-2)',
                      fontSize: 13,
                      fontWeight: selected ? 800 : 600,
                      boxShadow: selected ? '0 2px 6px rgba(20,35,26,.07)' : 'none',
                      cursor: settingsLoading ? 'wait' : 'pointer',
                    }}
                  >
                    {item === 'GBP' ? '£  GBP' : '₹  INR'}
                    {!settingsLoading && !available && (
                      <span style={{ display: 'block', marginTop: 2, fontSize: 10 }}>
                        Not set up
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 10px', color: 'var(--text-1)', fontSize: 14 }}>
              Billing interval
            </h3>
            <div
              role="group"
              aria-label="Billing interval"
              style={{
                display: 'inline-flex',
                gap: 4,
                padding: 4,
                border: '1px solid var(--border)',
                borderRadius: 11,
                background: 'var(--surface-2)',
              }}
            >
              {INTERVALS.map((item) => {
                const selected = billingInterval === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setBillingInterval(item)}
                    style={{
                      minWidth: 110,
                      padding: '10px 16px',
                      border: selected ? '1px solid #b5ebd2' : '1px solid transparent',
                      borderRadius: 8,
                      background: selected ? 'var(--surface)' : 'transparent',
                      color: selected ? 'var(--text-1)' : 'var(--text-2)',
                      fontSize: 13,
                      fontWeight: selected ? 800 : 600,
                      boxShadow: selected ? '0 2px 6px rgba(20,35,26,.07)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {item === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                  </button>
                );
              })}
            </div>
          </div>

          {optionsError ? (
            <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>
              {optionsError} Please try again later or contact support.
            </p>
          ) : !settingsLoading && !currencyAvailable ? (
            <p
              role="status"
              style={{
                margin: 0,
                padding: 12,
                border: '1px solid #f1d5a5',
                borderRadius: 10,
                background: '#fff9ed',
                color: '#79521c',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {currencyName(currency)} checkout is not available yet. Please contact JobIN support
              to ask about this currency.
            </p>
          ) : !settingsLoading && !stripeCheckoutAvailable ? (
            <p
              role="status"
              style={{
                margin: 0,
                padding: 12,
                border: '1px solid #f1d5a5',
                borderRadius: 10,
                background: '#fff9ed',
                color: '#79521c',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              This {currency} {billingInterval.toLowerCase()} price is not available for{' '}
              {selectedPlan.name} yet. Choose another option or contact JobIN support.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void startStripeCheckout()}
            disabled={checkoutLoading || settingsLoading || !stripeCheckoutAvailable}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              minHeight: 48,
              padding: '12px 18px',
              border: 'none',
              borderRadius: 10,
              background: stripeCheckoutAvailable
                ? 'linear-gradient(135deg, #00d991, #008c60)'
                : '#dce5de',
              color: stripeCheckoutAvailable ? '#072d20' : '#68756d',
              fontSize: 14,
              fontWeight: 800,
              cursor: stripeCheckoutAvailable ? 'pointer' : 'not-allowed',
              boxShadow: stripeCheckoutAvailable ? '0 6px 16px rgba(0,140,96,.18)' : 'none',
            }}
          >
            {checkoutLoading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <ArrowRight size={17} />
            )}
            {checkoutLoading
              ? 'Opening secure checkout…'
              : settingsLoading
                ? 'Loading plans…'
                : stripeCheckoutAvailable
                  ? isSignedIn
                    ? 'Continue to secure checkout'
                    : 'Sign in to continue'
                  : 'Not available yet'}
          </button>
        </div>

        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 13,
            padding: 'clamp(20px, 4vw, 30px)',
            borderLeft: '1px solid var(--border)',
            background:
              'radial-gradient(ellipse at 90% 0%, rgba(0,217,145,.13), transparent 55%), var(--surface-2)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: '5px 9px',
              borderRadius: 999,
              background: 'var(--brand-light)',
              color: 'var(--brand-dark)',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }}
          >
            Your selection
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-1)', fontSize: 22 }}>{selectedPlan.name}</h3>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.6 }}>
            {selectedPlan.tagline}
          </p>
          <div style={{ height: 1, margin: '3px 0', background: 'var(--border)' }} />
          {[
            `${selectedPlan.credits} AI credits`,
            `${selectedPlan.resumes} resume uploads`,
            `${selectedPlan.applications} tracked applications`,
          ].map((item) => (
            <span
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--text-2)',
                fontSize: 13,
              }}
            >
              <Check size={15} color="var(--brand-dark)" strokeWidth={3} /> {item}
            </span>
          ))}
          <p style={{ margin: 'auto 0 0', paddingTop: 10, color: 'var(--text-3)', fontSize: 11 }}>
            Review the total and subscription terms on Stripe before confirming your payment.
          </p>
        </aside>
      </section>

      <section
        aria-labelledby="comparison-heading"
        style={{
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 16,
          background: 'var(--surface)',
        }}
      >
        <div style={{ padding: '20px 22px 14px' }}>
          <h2 id="comparison-heading" style={{ margin: 0, color: 'var(--text-1)', fontSize: 20 }}>
            Compare plan limits
          </h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-3)', fontSize: 12 }}>
            Monthly AI credits reset each billing month. Resume and application limits vary by plan.
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 560,
              borderCollapse: 'collapse',
              color: 'var(--text-2)',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--text-1)' }}>
                {['Included', 'Free', 'Pro', 'Pro Max'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    style={{
                      padding: '12px 18px',
                      textAlign: heading === 'Included' ? 'left' : 'center',
                      fontWeight: 800,
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.label} style={{ borderTop: '1px solid var(--border)' }}>
                  <th
                    scope="row"
                    style={{ padding: '13px 18px', textAlign: 'left', fontWeight: 600 }}
                  >
                    {row.label}
                  </th>
                  {[row.free, row.premium, row.pro].map((value, index) => (
                    <td
                      key={`${row.label}-${index}`}
                      style={{ padding: '13px 18px', textAlign: 'center' }}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
