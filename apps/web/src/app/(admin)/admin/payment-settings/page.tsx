'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Currency = 'INR' | 'GBP';
type PlanCode = 'PREMIUM' | 'PRO';

interface PaymentOption {
  currency: Currency;
  methodLabel: string;
  paymentDetails: string;
  qrUrl: string;
  amounts: Record<PlanCode, number>;
}

export default function AdminPaymentSettingsPage() {
  const { getToken } = useAuth();
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Currency | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiClient.get<PaymentOption[]>('/billing/manual-payment-settings');
      setOptions(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load payment settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateOption = (currency: Currency, update: Partial<PaymentOption>) => {
    setOptions((current) => current.map((option) =>
      option.currency === currency ? { ...option, ...update } : option,
    ));
  };

  const save = async (option: PaymentOption) => {
    const token = await getToken();
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    setSaving(option.currency);
    try {
      await apiClient.patch(
        `/admin/payment-settings/${option.currency}`,
        {
          currency: option.currency,
          methodLabel: option.methodLabel,
          paymentDetails: option.paymentDetails,
          qrUrl: option.qrUrl,
          premiumAmount: Number(option.amounts.PREMIUM),
          proAmount: Number(option.amounts.PRO),
        },
        token,
      );
      toast.success(`${option.currency} payment settings saved.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save payment settings.');
    } finally {
      setSaving(null);
    }
  };

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

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Payment settings</h1>
        <p style={{ color: 'var(--text-2)' }}>
          Manage payment instructions and monthly prices shown to customers. Changes apply to new requests only.
        </p>
      </header>

      {loading ? (
        <Card hoverEffect={false}>Loading payment settings…</Card>
      ) : options.length === 0 ? (
        <Card hoverEffect={false}>No payment methods are available.</Card>
      ) : options.map((option) => (
        <Card key={option.currency} hoverEffect={false} style={{ display: 'grid', gap: 16 }}>
          <h2 style={{ margin: 0, color: 'var(--text-1)' }}>
            {option.currency} payment method
          </h2>
          <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
            Payment method label
            <input
              style={inputStyle}
              value={option.methodLabel}
              maxLength={80}
              onChange={(event) => updateOption(option.currency, { methodLabel: event.target.value })}
              placeholder="e.g. UPI or Bank transfer"
            />
          </label>
          <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
            QR image URL
            <input
              style={inputStyle}
              value={option.qrUrl}
              maxLength={500}
              onChange={(event) => updateOption(option.currency, { qrUrl: event.target.value })}
              placeholder="https://... or /payments/qr.png"
            />
          </label>
          <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
            Payment instructions / bank details
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
              value={option.paymentDetails}
              maxLength={1000}
              onChange={(event) => updateOption(option.currency, { paymentDetails: event.target.value })}
              placeholder="Customer-visible payment instructions"
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {(['PREMIUM', 'PRO'] as const).map((plan) => (
              <label key={plan} style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
                {plan === 'PREMIUM' ? 'Pro' : 'Pro Max'} monthly amount ({option.currency})
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="0.01"
                  value={option.amounts[plan]}
                  onChange={(event) => updateOption(option.currency, {
                    amounts: { ...option.amounts, [plan]: Number(event.target.value) },
                  })}
                />
              </label>
            ))}
          </div>
          <Button onClick={() => void save(option)} disabled={saving !== null}>
            {saving === option.currency ? 'Saving…' : `Save ${option.currency} settings`}
          </Button>
        </Card>
      ))}
    </div>
  );
}
