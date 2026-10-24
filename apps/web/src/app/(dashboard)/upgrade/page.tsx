'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

type PlanCode = 'PREMIUM' | 'PRO';
type CurrencyCode = 'INR' | 'GBP';
type BillingInterval = 'MONTHLY' | 'YEARLY';

interface ManualPaymentOption {
  currency: CurrencyCode;
  amounts: Record<PlanCode, number>;
  methods: Array<{ id: string; label: string; paymentDetails: string; qrUrl: string }>;
  stripeCheckout: Record<PlanCode, Record<BillingInterval, boolean>>;
}

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const initialPlan: PlanCode = searchParams.get('plan') === 'PRO' ? 'PRO' : 'PREMIUM';
  const [plan, setPlan] = useState<PlanCode>(initialPlan);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentType, setPaymentType] = useState<'manual' | 'stripe'>('manual');
  const [transactionReference, setTransactionReference] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<ManualPaymentOption[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient.get<ManualPaymentOption[]>('/billing/manual-payment-settings')
      .then((options) => {
        if (active) setPaymentOptions(options);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : 'Could not load payment options.');
        }
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!submitted) return;
    const timeout = window.setTimeout(() => router.push('/dashboard'), 5000);
    return () => window.clearTimeout(timeout);
  }, [router, submitted]);

  const paymentOption = paymentOptions.find((option) => option.currency === currency);
  const methods = paymentOption?.methods ?? [];
  const selectedMethod = methods.find((method) => method.id === paymentMethodId) ?? methods[0];
  const qrUrl = selectedMethod?.qrUrl;
  const paymentDetails = selectedMethod?.paymentDetails;
  const paymentMethodConfigured = Boolean(qrUrl || paymentDetails);
  const selectedAmount = paymentOption?.amounts[plan] ?? 0;
  const stripeCheckoutAvailable = paymentOption?.stripeCheckout[plan][billingInterval] ?? false;
  const stripeCheckoutAvailableForPlan = paymentOption?.stripeCheckout[plan].MONTHLY ||
    paymentOption?.stripeCheckout[plan].YEARLY;

  const submitPayment = async () => {
    if (!isSignedIn) {
      router.push('/auth/login?next=%2Fupgrade');
      return;
    }
    if (transactionReference.trim().length < 3) {
      toast.error('Enter the payment transaction/reference number.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      await apiClient.post('/billing/manual-payment-requests', {
        plan,
        currency,
        paymentMethodId: selectedMethod?.id,
        transactionReference: transactionReference.trim(),
      }, token);
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit your payment for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const startStripeCheckout = async () => {
    if (!isSignedIn) {
      router.push('/auth/login?next=%2Fupgrade');
      return;
    }
    setCheckoutLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const result = await apiClient.post<{ url: string }>('/billing/create-checkout-session', {
        plan,
        currency,
        interval: billingInterval,
      }, token);
      if (!result.url) throw new Error('Stripe did not return a checkout link.');
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Stripe Checkout.');
      setCheckoutLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: '40px auto' }}>
        <Card hoverEffect={false} style={{ padding: 32, textAlign: 'center' }}>
          <Clock3 size={40} style={{ color: 'var(--brand)', margin: '0 auto' }} />
          <h1 style={{ color: 'var(--text-1)' }}>Payment submitted</h1>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
            Thanks for choosing {plan === 'PREMIUM' ? 'Pro' : 'Pro Max'}! We received your payment reference.
            Our team will verify it and add your plan shortly.
          </p>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
            Need help? Contact{' '}
            <a href="mailto:159ring@gmail.com" style={{ color: 'var(--brand)', fontWeight: 700 }}>
              159ring@gmail.com
            </a>.
          </p>
          <Button onClick={() => router.push('/dashboard')}>Return to dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, color: 'var(--text-1)', fontSize: 30 }}>Choose your plan</h1>
        <p style={{ color: 'var(--text-2)' }}>Choose manual payment or Stripe Checkout. Manual transfers require verification; Stripe activates your plan after confirmed payment.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
        {([
          { code: 'PREMIUM' as const, name: 'Pro', description: 'More room for your job search.' },
          { code: 'PRO' as const, name: 'Pro Max', description: 'Maximum tools and priority AI.' },
        ]).map((item) => (
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
            {paymentType === 'manual' ? (
              <>
                <strong>{currency === 'INR' ? '₹' : '£'}{paymentOption?.amounts[item.code] ?? '—'}</strong>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}> / month (manual transfer)</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Stripe price shown at checkout</span>
            )}
          </button>
        ))}
      </div>

      <Card hoverEffect={false} style={{ padding: 24, display: 'grid', gap: 18 }}>
        <div>
          <h2 style={{ marginTop: 0, color: 'var(--text-1)' }}>Currency</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['INR', 'GBP'] as CurrencyCode[]).map((item) => (
              <Button key={item} variant={currency === item ? 'primary' : 'ghost'} onClick={() => {
                setCurrency(item);
                setPaymentMethodId('');
              }}>
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant={paymentType === 'manual' ? 'primary' : 'ghost'} onClick={() => setPaymentType('manual')}>
            UPI / bank transfer
          </Button>
          {stripeCheckoutAvailableForPlan && (
            <Button variant={paymentType === 'stripe' ? 'primary' : 'ghost'} onClick={() => setPaymentType('stripe')}>
              Stripe Checkout
            </Button>
          )}
        </div>

        {paymentType === 'stripe' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['MONTHLY', 'YEARLY'] as BillingInterval[]).map((interval) => (
                <Button key={interval} variant={billingInterval === interval ? 'primary' : 'ghost'} onClick={() => setBillingInterval(interval)}>
                  {interval === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                </Button>
              ))}
            </div>
            {stripeCheckoutAvailable ? (
              <>
                <p style={{ color: 'var(--text-2)', margin: 0 }}>
                  Stripe securely processes {plan === 'PREMIUM' ? 'Pro' : 'Pro Max'} in {currency} ({billingInterval.toLowerCase()}).
                  Your subscription activates when Stripe confirms payment.
                </p>
                <Button onClick={startStripeCheckout} disabled={checkoutLoading || settingsLoading}>
                  {checkoutLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {checkoutLoading ? 'Opening Stripe…' : isSignedIn ? 'Continue to Stripe Checkout' : 'Sign in to continue'}
                </Button>
              </>
            ) : (
              <p style={{ color: 'var(--text-3)' }}>Stripe Checkout is not configured for this billing period yet.</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <h3 style={{ color: 'var(--text-1)' }}>Choose a payment method</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {methods.map((method) => (
                  <Button
                    key={method.id}
                    variant={(selectedMethod?.id === method.id) ? 'primary' : 'ghost'}
                    onClick={() => setPaymentMethodId(method.id)}
                  >
                    {method.label}
                  </Button>
                ))}
                {methods.length === 0 && !settingsLoading && (
                  <p style={{ color: 'var(--text-3)' }}>No manual payment methods are available for this currency.</p>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, alignItems: 'center' }}>
              <div style={{ minHeight: 210, border: '1px dashed var(--border)', borderRadius: 12, display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center' }}>
                {settingsLoading ? (
                  <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading payment details…</p>
                ) : qrUrl ? (
                  <Image src={qrUrl} alt={`${selectedMethod?.label ?? 'Payment'} QR code`} width={190} height={190} unoptimized style={{ maxWidth: 190, maxHeight: 190, objectFit: 'contain' }} />
                ) : (
                  <p style={{ color: 'var(--text-3)', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    {paymentDetails || 'Payment details are not configured yet.'}
                  </p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-2)' }}>
                  Pay <strong>{currency === 'INR' ? '₹' : '£'}{selectedAmount}</strong> for {plan === 'PREMIUM' ? 'Pro' : 'Pro Max'}.
                </p>
                {paymentDetails && qrUrl && <p style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{paymentDetails}</p>}
                <label style={{ display: 'grid', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                  Payment transaction/reference number
                  <input value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} maxLength={120} required placeholder="Enter the reference shown by your payment provider" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--surface-2)', color: 'var(--text-1)' }} />
                </label>
              </div>
            </div>
            <Button onClick={submitPayment} disabled={submitting || settingsLoading || !selectedMethod || !paymentMethodConfigured}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {settingsLoading ? 'Loading payment method…' : !selectedMethod || !paymentMethodConfigured ? 'Payment method not configured yet' : isSignedIn ? 'Submit payment for review' : 'Sign in to submit payment'}
            </Button>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
              The plan remains inactive until an admin verifies the transfer. Need help?{' '}
              <a href="mailto:159ring@gmail.com" style={{ color: 'var(--brand)' }}>Contact 159ring@gmail.com.</a>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
