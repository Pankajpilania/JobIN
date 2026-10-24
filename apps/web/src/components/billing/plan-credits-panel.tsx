'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CreditCard, Loader2, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BillingUsage } from '@/types';

interface PlanCreditsPanelProps {
  source?: {
    data?: BillingUsage;
    isLoading: boolean;
    error?: string;
    retry: () => void;
  };
}

export function PlanCreditsPanel({ source }: PlanCreditsPanelProps) {
  const router = useRouter();
  const { getToken, isReady, isSignedIn, userId } = useAuth();
  const [openingBilling, setOpeningBilling] = useState(false);
  const usageQuery = useQuery<BillingUsage>({
    queryKey: ['billing-usage', userId],
    enabled: !source && isReady && isSignedIn,
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      return apiClient.get<BillingUsage>('/billing/usage', token);
    },
  });
  const usage = source ? source.data : usageQuery.data;

  const openBilling = async () => {
    setOpeningBilling(true);
    if (!usage?.hasActiveSubscription) {
      router.push('/upgrade');
      return;
    }
    if (!usage.canManagePlan) {
      toast.error('This subscription is managed by JobIN. Contact support to change it.');
      setOpeningBilling(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');

      const result = await apiClient.post<{ url: string }>('/billing/portal', {}, token);

      if (!result.url) throw new Error('Billing did not return a secure checkout link.');
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open billing right now.');
      setOpeningBilling(false);
    }
  };

  const isLoading = source ? source.isLoading : !isReady || (isSignedIn && usageQuery.isLoading);
  const error = source?.error ?? (usageQuery.isError ? usageQuery.error.message : undefined);
  const retry =
    source?.retry ??
    (() => {
      void usageQuery.refetch();
    });
  const limit = usage?.creditsIncluded;
  const usedPercentage =
    usage && limit && limit > 0 ? Math.min((usage.creditsUsed / limit) * 100, 100) : 0;

  return (
    <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}
          >
            <Zap
              aria-hidden="true"
              style={{ height: '18px', width: '18px', color: 'var(--brand)' }}
            />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Plan &amp; AI credits</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '6px 0 0 0' }}>
            Your plan and AI requests used during the current billing period.
          </p>
        </div>
        {error && (
          <button
            type="button"
            onClick={retry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: 0,
              background: 'transparent',
              color: 'var(--brand)',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <RefreshCw aria-hidden="true" size={14} /> Retry
          </button>
        )}
      </div>

      {isLoading ? (
        <p role="status" style={{ margin: 0, color: 'var(--text-2)', fontSize: '13px' }}>
          Loading plan and AI credit usage…
        </p>
      ) : error ? (
        <p role="alert" style={{ margin: 0, color: '#b91c1c', fontSize: '13px' }}>
          Could not load plan and AI credit usage: {error}
        </p>
      ) : usage ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-2)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                  margin: 0,
                }}
              >
                Current plan
              </p>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-1)',
                  textTransform: 'capitalize',
                  margin: '4px 0 0 0',
                }}
              >
                {usage.planName.toLowerCase()}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--brand)',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <CreditCard aria-hidden="true" size={16} />
              {usage.hasActiveSubscription ? 'Subscription active' : 'Free plan'}
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <span style={{ color: 'var(--text-2)', fontSize: '13px', fontWeight: 600 }}>
                AI credits used
              </span>
              <strong style={{ color: 'var(--text-1)', fontSize: '14px' }}>
                {usage.creditsUsed}
                {limit === null ? ' used · unlimited plan' : ` / ${limit}`}
              </strong>
            </div>
            <div
              role="progressbar"
              aria-label="AI credits used this billing period"
              aria-valuemin={0}
              aria-valuemax={limit ?? Math.max(usage.creditsUsed, 1)}
              aria-valuenow={usage.creditsUsed}
              style={{
                height: '8px',
                overflow: 'hidden',
                borderRadius: '999px',
                backgroundColor: 'var(--surface-2)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${limit === null ? 0 : usedPercentage}%`,
                  borderRadius: 'inherit',
                  backgroundColor: 'var(--brand)',
                  transition: 'width 250ms ease',
                }}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '7px 0 0 0' }}>
              {usage.creditsRemaining === null
                ? 'Unlimited AI credits'
                : `${usage.creditsRemaining} credits remaining`}
              {' · Resets '}
              {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
                new Date(usage.periodEnd),
              )}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
              {usage.hasActiveSubscription && !usage.canManagePlan
                ? 'This plan is managed by JobIN. Contact support to change it.'
                : 'Usage counts completed AI analyses and generations.'}
            </p>
            <Button
              type="button"
              onClick={openBilling}
              disabled={
                openingBilling || isLoading || (usage.hasActiveSubscription && !usage.canManagePlan)
              }
              style={{
                opacity:
                  openingBilling ||
                  isLoading ||
                  (usage.hasActiveSubscription && !usage.canManagePlan)
                    ? 0.7
                    : 1,
              }}
            >
              {openingBilling ? (
                <Loader2 aria-hidden="true" size={16} className="animate-spin" />
              ) : null}
              {openingBilling
                ? 'Opening…'
                : usage.hasActiveSubscription
                  ? usage.canManagePlan
                    ? 'Manage plan'
                    : 'Managed by JobIN'
                  : 'Upgrade to Premium'}
              {!openingBilling ? <ArrowUpRight aria-hidden="true" size={15} /> : null}
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
