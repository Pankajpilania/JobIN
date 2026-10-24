'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Currency = 'INR' | 'GBP';
type PlanCode = 'PREMIUM' | 'PRO';
type Interval = 'MONTHLY' | 'YEARLY';

interface RegionalSettings {
  currency: Currency;
  methodLabel: string;
  paymentDetails: string;
  qrUrl: string;
  amounts: Record<PlanCode, number>;
}

interface ManualMethod {
  id: string;
  currency: Currency;
  label: string;
  paymentDetails: string;
  qrUrl: string;
  enabled: boolean;
}

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
  return PLANS.flatMap((plan) => CURRENCIES.flatMap((currency) =>
    INTERVALS.map((interval) => ({ plan, currency, interval, stripePriceId: '' })),
  ));
}

export default function AdminPaymentSettingsPage() {
  const { getToken } = useAuth();
  const [regions, setRegions] = useState<RegionalSettings[]>([]);
  const [methods, setMethods] = useState<ManualMethod[]>([]);
  const [stripePrices, setStripePrices] = useState<StripePrice[]>(emptyStripePrices);
  const [newMethod, setNewMethod] = useState({ currency: 'INR' as Currency, label: '', paymentDetails: '', qrUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [regionSettings, paymentMethods, configuredPrices] = await Promise.all([
        apiClient.get<RegionalSettings[]>('/admin/payment-settings', token),
        apiClient.get<ManualMethod[]>('/admin/payment-methods', token),
        apiClient.get<Array<StripePrice & { id: string }>>('/admin/stripe-prices', token),
      ]);
      setRegions(regionSettings);
      setMethods(paymentMethods);
      const configuredByKey = new Map(configuredPrices.map((price) => [
        `${price.plan}:${price.currency}:${price.interval}`,
        price.stripePriceId,
      ]));
      setStripePrices(emptyStripePrices().map((price) => ({
        ...price,
        stripePriceId: configuredByKey.get(`${price.plan}:${price.currency}:${price.interval}`) ?? '',
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load payment settings.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRegion = (currency: Currency, update: Partial<RegionalSettings>) => {
    setRegions((current) => current.map((region) =>
      region.currency === currency ? { ...region, ...update } : region,
    ));
  };

  const saveRegion = async (region: RegionalSettings) => {
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setSaving(`region-${region.currency}`);
    try {
      await apiClient.patch(`/admin/payment-settings/${region.currency}`, {
        currency: region.currency,
        methodLabel: region.methodLabel,
        paymentDetails: region.paymentDetails,
        qrUrl: region.qrUrl,
        premiumAmount: Number(region.amounts.PREMIUM),
        proAmount: Number(region.amounts.PRO),
      }, token);
      toast.success(`${region.currency} plan prices saved.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save regional pricing.');
    } finally {
      setSaving(null);
    }
  };

  const saveMethod = async (method: ManualMethod) => {
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setSaving(method.id);
    try {
      await apiClient.patch(`/admin/payment-methods/${method.id}`, method, token);
      toast.success(`${method.label} saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save payment method.');
    } finally {
      setSaving(null);
    }
  };

  const addMethod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setSaving('new-method');
    try {
      const created = await apiClient.post<ManualMethod>('/admin/payment-methods', newMethod, token);
      setMethods((current) => [...current, created]);
      setNewMethod({ currency: 'INR', label: '', paymentDetails: '', qrUrl: '' });
      toast.success('Payment method added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add payment method.');
    } finally {
      setSaving(null);
    }
  };

  const saveStripePrices = async () => {
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setSaving('stripe-prices');
    try {
      await apiClient.post('/admin/stripe-prices', { prices: stripePrices }, token);
      toast.success('Stripe Checkout prices saved. Stripe-confirmed payments activate automatically.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Stripe prices.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Card hoverEffect={false}>Loading payment settings…</Card>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Payment settings</h1>
        <p style={{ color: 'var(--text-2)' }}>
          Configure multiple UPI and bank-transfer options per currency, plan prices, and Stripe Checkout.
          Manual transfers remain pending until reviewed; verified Stripe checkouts activate automatically.
        </p>
      </header>

      <section style={{ display: 'grid', gap: 16 }}>
        <h2 style={{ color: 'var(--text-1)', margin: 0 }}>Manual payment methods</h2>
        {methods.map((method) => (
          <Card key={method.id} hoverEffect={false} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
                Currency
                <select style={inputStyle} value={method.currency} onChange={(event) => {
                  const currency = event.target.value as Currency;
                  setMethods((current) => current.map((item) => item.id === method.id ? { ...item, currency } : item));
                }}>
                  {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
                Method name
                <input style={inputStyle} value={method.label} maxLength={80} onChange={(event) => {
                  setMethods((current) => current.map((item) => item.id === method.id ? { ...item, label: event.target.value } : item));
                }} />
              </label>
            </div>
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
              Customer payment instructions
              <textarea style={{ ...inputStyle, minHeight: 72 }} value={method.paymentDetails} maxLength={1000} onChange={(event) => {
                setMethods((current) => current.map((item) => item.id === method.id ? { ...item, paymentDetails: event.target.value } : item));
              }} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
              QR image URL (HTTPS or root-relative)
              <input style={inputStyle} value={method.qrUrl} maxLength={500} onChange={(event) => {
                setMethods((current) => current.map((item) => item.id === method.id ? { ...item, qrUrl: event.target.value } : item));
              }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-2)', fontSize: 13 }}>
                <input type="checkbox" checked={method.enabled} onChange={(event) => {
                  setMethods((current) => current.map((item) => item.id === method.id ? { ...item, enabled: event.target.checked } : item));
                }} />
                Visible to customers
              </label>
              <Button disabled={saving !== null} onClick={() => void saveMethod(method)}>
                {saving === method.id ? 'Saving…' : 'Save method'}
              </Button>
            </div>
          </Card>
        ))}

        <Card hoverEffect={false}>
          <form onSubmit={addMethod} style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ margin: 0, color: 'var(--text-1)' }}>Add a payment method</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
              <select style={inputStyle} value={newMethod.currency} onChange={(event) => setNewMethod((current) => ({ ...current, currency: event.target.value as Currency }))}>
                {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
              </select>
              <input style={inputStyle} required maxLength={80} placeholder="e.g. UPI, bank transfer" value={newMethod.label} onChange={(event) => setNewMethod((current) => ({ ...current, label: event.target.value }))} />
            </div>
            <textarea style={{ ...inputStyle, minHeight: 72 }} maxLength={1000} placeholder="Payment details and instructions shown to customers" value={newMethod.paymentDetails} onChange={(event) => setNewMethod((current) => ({ ...current, paymentDetails: event.target.value }))} />
            <input style={inputStyle} maxLength={500} placeholder="QR image URL (optional)" value={newMethod.qrUrl} onChange={(event) => setNewMethod((current) => ({ ...current, qrUrl: event.target.value }))} />
            <Button type="submit" disabled={saving !== null}>{saving === 'new-method' ? 'Adding…' : 'Add method'}</Button>
          </form>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <h2 style={{ color: 'var(--text-1)', margin: 0 }}>Manual plan prices</h2>
        {regions.map((region) => (
          <Card key={region.currency} hoverEffect={false} style={{ display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, color: 'var(--text-1)' }}>{region.currency}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {PLANS.map((plan) => (
                <label key={plan} style={{ display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
                  {plan} monthly amount
                  <input style={inputStyle} type="number" min={0} step="0.01" value={region.amounts[plan]} onChange={(event) => updateRegion(region.currency, { amounts: { ...region.amounts, [plan]: Number(event.target.value) } })} />
                </label>
              ))}
            </div>
            <Button disabled={saving !== null} onClick={() => void saveRegion(region)}>
              {saving === `region-${region.currency}` ? 'Saving…' : `Save ${region.currency} prices`}
            </Button>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ color: 'var(--text-1)', margin: 0 }}>Stripe Checkout Price IDs</h2>
          <p style={{ color: 'var(--text-2)' }}>Create recurring Prices in Stripe for each plan/currency/interval, then enter their Price IDs here. Do not enter Stripe secret keys.</p>
        </div>
        <Card hoverEffect={false} style={{ display: 'grid', gap: 14 }}>
          {stripePrices.map((price, index) => (
            <label key={`${price.plan}-${price.currency}-${price.interval}`} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 2fr', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontSize: 13 }}>
              <span>{price.plan}</span>
              <span>{price.currency}</span>
              <span>{price.interval.toLowerCase()}</span>
              <input style={inputStyle} placeholder="price_…" value={price.stripePriceId} onChange={(event) => {
                setStripePrices((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stripePriceId: event.target.value.trim() } : item));
              }} />
            </label>
          ))}
          <Button disabled={saving !== null} onClick={() => void saveStripePrices()}>
            {saving === 'stripe-prices' ? 'Saving…' : 'Save Stripe prices'}
          </Button>
        </Card>
      </section>
    </div>
  );
}
