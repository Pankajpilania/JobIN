'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { listSubscriptions } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSubscriptionsPage() {
  const { getToken } = useAuth();
  const [data,   setData]   = useState<any>({ data: [], meta: {} });
  const [loading,setLoading]= useState(true);
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await listSubscriptions(token, { status: status || undefined, page, limit: 25 });
      setData(res);
    } catch {
      toast.error('Failed to load subscriptions list');
    } finally {
      setLoading(false);
    }
  }, [getToken, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const { data: rows = [], meta = {} } = data;
  const totalPages = (meta as any).totalPages ?? 1;

  const getStatusVariant = (s: string) => {
    if (s === 'ACTIVE') return 'success';
    if (s === 'CANCELLED') return 'neutral';
    return 'neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ userSelect: 'none' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          Subscriptions
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          {(meta as any).total?.toLocaleString() ?? '—'} active client service subscriptions total
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', userSelect: 'none' }}>
        {['', 'ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED'].map(s => {
          const active = status === s;
          return (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              style={{
                borderRadius: '8px',
                border: '1px solid',
                borderColor: active ? 'var(--brand)' : 'var(--border)',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition)',
                backgroundColor: active ? 'var(--brand-light)' : 'var(--surface)',
                color: active ? 'var(--brand)' : 'var(--text-3)'
              }}
            >
              {s || 'All Plans'}
            </button>
          );
        })}
      </div>

      {/* Table grid */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', color: 'var(--text-1)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>User Profile</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Plan Selected</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Billing Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Renewal Date</th>
              <th style={{ padding: '14px 16px', textAlign: 'right', userSelect: 'none' }}>Stripe Subscription ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '64px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: '12px', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
                    <span>Loading subscriptions...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '64px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: '12px', userSelect: 'none' }}>
                  No subscription records match criteria
                </td>
              </tr>
            ) : (
              rows.map((sub: any) => (
                <tr
                  key={sub.id}
                  style={{ borderBottom: '1px solid rgba(228, 228, 240, 0.6)', transition: 'var(--transition)' }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{sub.user?.fullName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>{sub.user?.email}</p>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <p style={{ fontWeight: 700, color: 'var(--brand)', margin: 0 }}>{sub.plan?.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>£{sub.plan?.priceMonthly}/mo</p>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge variant={getStatusVariant(sub.status)}>
                      {sub.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-2)', fontWeight: 600 }}>
                    {sub.cancelAtPeriodEnd ? (
                      <span style={{ color: '#F59E0B', fontWeight: 700 }}>Cancels {new Date(sub.currentPeriodEnd).toLocaleDateString('en-GB')}</span>
                    ) : (
                      new Date(sub.currentPeriodEnd).toLocaleDateString('en-GB')
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-3)', userSelect: 'all', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px' }}>
                      {sub.stripeSubscriptionId?.slice(0, 18)}…
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination control */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '8px', userSelect: 'none' }}>
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft style={{ height: '14px', width: '14px' }} /> Previous
          </Button>
          <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Next <ArrowRight style={{ height: '14px', width: '14px' }} />
          </Button>
        </div>
      )}
    </div>
  );
}
