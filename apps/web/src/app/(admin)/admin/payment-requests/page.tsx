'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ManualPaymentRequest {
  id: string;
  currency: 'INR' | 'GBP';
  amount: number;
  paymentMethodLabel?: string | null;
  transactionReference: string;
  status: string;
  createdAt: string;
  user: { fullName: string; email: string };
  plan: { name: string };
}

export default function AdminPaymentRequestsPage() {
  const { getToken } = useAuth();
  const [requests, setRequests] = useState<ManualPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const result = await apiClient.get<ManualPaymentRequest[]>('/billing/manual-payment-requests?status=PENDING', token);
      setRequests(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load payment requests.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    const token = await getToken();
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }
    setProcessing(id);
    try {
      await apiClient.post(`/billing/manual-payment-requests/${id}/review`, { action }, token);
      toast.success(action === 'approve' ? 'Payment verified and plan activated.' : 'Payment request rejected.');
      await loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not review payment request.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Manual payment requests</h1>
        <p style={{ color: 'var(--text-2)' }}>Verify the user and transaction reference before approving a plan.</p>
      </header>
      {loading ? (
        <Card hoverEffect={false}>Loading payment requests…</Card>
      ) : requests.length === 0 ? (
        <Card hoverEffect={false}>There are no pending payment requests.</Card>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', color: 'var(--text-1)' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'var(--surface-2)' }}>
                <th style={{ padding: 12 }}>Account</th>
                <th style={{ padding: 12 }}>Plan</th>
                <th style={{ padding: 12 }}>Amount</th>
                <th style={{ padding: 12 }}>Method</th>
                <th style={{ padding: 12 }}>Transaction reference</th>
                <th style={{ padding: 12 }}>Submitted</th>
                <th style={{ padding: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>
                    <strong>{request.user.fullName}</strong><br />
                    <a href={`mailto:${request.user.email}`}>{request.user.email}</a>
                  </td>
                  <td style={{ padding: 12 }}>{request.plan.name === 'PREMIUM' ? 'Pro' : 'Pro Max'}</td>
                  <td style={{ padding: 12 }}>{request.currency === 'INR' ? '₹' : '£'}{request.amount} {request.currency}</td>
                  <td style={{ padding: 12 }}>{request.paymentMethodLabel ?? 'Manual payment'}</td>
                  <td style={{ padding: 12, fontFamily: 'monospace' }}>{request.transactionReference}</td>
                  <td style={{ padding: 12 }}>{new Date(request.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                    <Button disabled={processing === request.id} onClick={() => review(request.id, 'approve')}>Approve</Button>
                    <Button variant="ghost" disabled={processing === request.id} onClick={() => review(request.id, 'reject')}>Decline</Button>
                    <Badge variant="neutral">{request.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
