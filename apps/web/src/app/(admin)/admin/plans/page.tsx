'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { toast } from 'sonner';
import { Check, Plus, RefreshCw, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: 'GBP' | 'INR';
  isActive: boolean;
  aiCreditsMonthly: number;
  subscriberCount: number;
};

type PlanDraft = Pick<Plan, 'priceMonthly' | 'priceYearly' | 'currency' | 'isActive' | 'aiCreditsMonthly'>;

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 8,
  padding: '10px 12px', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 14,
};

const fieldStyle: CSSProperties = {
  display: 'grid', gap: 6, color: 'var(--text-2)', fontSize: 12, fontWeight: 650,
};

export default function AdminPlansPage() {
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newPlan, setNewPlan] = useState({
    name: '', priceMonthly: '0', priceYearly: '0', currency: 'GBP' as 'GBP' | 'INR', aiCreditsMonthly: '20',
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again to manage plans.');
      const result = await apiClient.get<Plan[]>('/admin/plans', token);
      setPlans(result);
      setDrafts(Object.fromEntries(result.map((plan) => [plan.id, {
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        isActive: plan.isActive,
        aiCreditsMonthly: plan.aiCreditsMonthly,
      }])));
      setError('');
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load plans.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  const updateDraft = (id: string, field: keyof PlanDraft, value: number | string | boolean) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const savePlan = async (plan: Plan) => {
    const draft = drafts[plan.id];
    if (!draft || !Number.isInteger(Number(draft.aiCreditsMonthly)) || Number(draft.aiCreditsMonthly) < -1) {
      toast.error('AI credits must be -1 (unlimited) or a non-negative whole number.');
      return;
    }
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setSavingId(plan.id);
    try {
      await apiClient.patch(`/admin/plans/${encodeURIComponent(plan.id)}`, {
        ...draft,
        aiCreditsMonthly: Number(draft.aiCreditsMonthly),
        priceMonthly: Number(draft.priceMonthly),
        priceYearly: Number(draft.priceYearly),
      }, token);
      toast.success(`${plan.name} plan saved.`);
      await loadPlans();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not save this plan.');
    } finally {
      setSavingId('');
    }
  };

  const createPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = newPlan.name.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(normalizedName)) {
      toast.error('Use a plan code with 2–40 letters, numbers, or underscores, starting with a letter.');
      return;
    }
    const credits = Number(newPlan.aiCreditsMonthly);
    const monthly = Number(newPlan.priceMonthly);
    const yearly = Number(newPlan.priceYearly);
    if (!Number.isInteger(credits) || credits < -1 || !Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) {
      toast.error('Enter valid prices and AI credits (-1 means unlimited).');
      return;
    }
    const token = await getToken();
    if (!token) return toast.error('Please sign in again.');
    setCreating(true);
    try {
      await apiClient.post('/admin/plans', {
        name: normalizedName,
        priceMonthly: monthly,
        priceYearly: yearly,
        currency: newPlan.currency,
        aiCreditsMonthly: credits,
      }, token);
      toast.success(`${normalizedName} plan created.`);
      setNewPlan({ name: '', priceMonthly: '0', priceYearly: '0', currency: 'GBP', aiCreditsMonthly: '20' });
      await loadPlans();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Could not create this plan.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 22, maxWidth: 1100, margin: '0 auto', paddingBottom: 36 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-1)' }}>Plans &amp; AI credits</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.6 }}>
            Edit monthly AI allowances, pricing metadata, and plan availability. Use <strong>-1</strong> for unlimited AI credits.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void loadPlans()} disabled={loading} aria-label="Refresh plans">
          <RefreshCw size={16} /> Refresh
        </Button>
      </header>

      {error && <Card hoverEffect={false}><p role="alert" style={{ marginTop: 0 }}>{error}</p><Button onClick={() => void loadPlans()}>Retry</Button></Card>}

      <Card hoverEffect={false} style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-1)' }}>Create a plan</h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
            New paid plans need Stripe recurring prices configured separately under Payment settings before checkout is available.
          </p>
        </div>
        <form onSubmit={(event) => void createPlan(event)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label style={fieldStyle}>Plan code<input required maxLength={40} style={inputStyle} placeholder="STARTER" value={newPlan.name} onChange={(event) => setNewPlan({ ...newPlan, name: event.target.value.toUpperCase() })} /></label>
          <label style={fieldStyle}>Monthly price<input required type="number" min="0" step="0.01" style={inputStyle} value={newPlan.priceMonthly} onChange={(event) => setNewPlan({ ...newPlan, priceMonthly: event.target.value })} /></label>
          <label style={fieldStyle}>Yearly price<input required type="number" min="0" step="0.01" style={inputStyle} value={newPlan.priceYearly} onChange={(event) => setNewPlan({ ...newPlan, priceYearly: event.target.value })} /></label>
          <label style={fieldStyle}>Currency<select style={inputStyle} value={newPlan.currency} onChange={(event) => setNewPlan({ ...newPlan, currency: event.target.value as 'GBP' | 'INR' })}><option value="GBP">GBP</option><option value="INR">INR</option></select></label>
          <label style={fieldStyle}>AI credits / month<input required type="number" min="-1" step="1" style={inputStyle} value={newPlan.aiCreditsMonthly} onChange={(event) => setNewPlan({ ...newPlan, aiCreditsMonthly: event.target.value })} /></label>
          <Button type="submit" disabled={creating} style={{ minHeight: 40 }}><Plus size={16} />{creating ? 'Creating…' : 'Create plan'}</Button>
        </form>
      </Card>

      <section aria-labelledby="existing-plans-heading" style={{ display: 'grid', gap: 12 }}>
        <h2 id="existing-plans-heading" style={{ margin: 0, fontSize: 18, color: 'var(--text-1)' }}>Existing plans</h2>
        {loading && plans.length === 0 ? <Card hoverEffect={false}>Loading plans…</Card> : null}
        {!loading && plans.length === 0 && !error ? <Card hoverEffect={false}>No plans found.</Card> : null}
        {plans.map((plan) => {
          const draft = drafts[plan.id];
          if (!draft) return null;
          return (
            <Card key={plan.id} hoverEffect={false} style={{ display: 'grid', gap: 16, borderColor: 'var(--border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-1)', fontSize: 16 }}>{plan.name}</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 12 }}>{plan.subscriberCount} subscribers</p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13 }}>
                  <input type="checkbox" checked={draft.isActive} disabled={plan.name === 'FREE'} onChange={(event) => updateDraft(plan.id, 'isActive', event.target.checked)} />
                  {draft.isActive ? 'Available' : 'Archived'}
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, alignItems: 'end' }}>
                <label style={fieldStyle}>Monthly price<input type="number" min="0" step="0.01" style={inputStyle} value={draft.priceMonthly} onChange={(event) => updateDraft(plan.id, 'priceMonthly', Number(event.target.value))} /></label>
                <label style={fieldStyle}>Yearly price<input type="number" min="0" step="0.01" style={inputStyle} value={draft.priceYearly} onChange={(event) => updateDraft(plan.id, 'priceYearly', Number(event.target.value))} /></label>
                <label style={fieldStyle}>Currency<select style={inputStyle} value={draft.currency} onChange={(event) => updateDraft(plan.id, 'currency', event.target.value)}><option value="GBP">GBP</option><option value="INR">INR</option></select></label>
                <label style={fieldStyle}>AI credits / month<input type="number" min="-1" step="1" style={inputStyle} value={draft.aiCreditsMonthly} onChange={(event) => updateDraft(plan.id, 'aiCreditsMonthly', Number(event.target.value))} /></label>
                <Button disabled={savingId === plan.id} onClick={() => void savePlan(plan)}><Save size={15} />{savingId === plan.id ? 'Saving…' : 'Save changes'}</Button>
              </div>
              {plan.name === 'FREE' && <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, color: 'var(--text-3)', fontSize: 12 }}><Check size={14} /> The FREE plan stays available to new accounts.</p>}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
