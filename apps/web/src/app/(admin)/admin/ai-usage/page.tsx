'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getAIUsage } from '@/lib/admin-api';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o':           'var(--brand)',
  'gpt-4o-mini':      'var(--brand-mid)',
  'gpt-4-turbo':      '#10B981',
  'gpt-3.5-turbo':    '#3B82F6',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Card hoverEffect={false} style={{ padding: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', fontSize: '12px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '4px', fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? 'var(--text-1)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: p.stroke || p.fill || 'var(--brand)' }} />
          {p.name}: {p.value?.toLocaleString()}
        </div>
      ))}
    </Card>
  );
}

export default function AdminAIUsagePage() {
  const { getToken } = useAuth();
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(async token => {
      if (!token) return;
      try { setData(await getAIUsage(token)); } catch { /* ignore */ }
      setLoading(false);
    });
  }, [getToken]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-3)', fontWeight: 600, fontSize: '14px' }}>
      <RefreshCw style={{ height: '20px', width: '20px', animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
      <span>Loading AI usage data…</span>
    </div>
  );

  if (!data) return (
    <div style={{ padding: '32px', fontSize: '12px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      <span>⚠️</span> Failed to load data.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ userSelect: 'none' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          AI Usage Monitoring
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Token consumption, model usage, and cost tracking.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {[
          { label: 'Total AI Requests', value: data.totals?.requests?.toLocaleString() ?? 0, color: 'var(--brand)', icon: '🤖' },
          { label: 'Total Tokens Used', value: data.totals?.tokens?.toLocaleString() ?? 0, color: 'var(--brand-mid)', icon: '⚡' },
          { label: 'Total Cost (USD)', value: `$${data.totals?.costUsd?.toFixed(2) ?? 0}`, color: '#F59E0B', icon: '💵' },
        ].map(({ label, value, color, icon }) => (
          <Card key={label} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span>{icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Tokens by day */}
        <div style={{ flex: '2 1 500px' }}>
          <Card hoverEffect={false}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '16px', marginTop: 0, userSelect: 'none' }}>Daily Token Usage (Last 30 Days)</h3>
            {data.byDay?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.byDay}>
                  <defs>
                    <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148, 148, 176, 0.1)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="tokens" name="Tokens" stroke="var(--brand)" fill="url(#tokGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600 }}>No data yet</div>}
          </Card>
        </div>

        {/* Tokens by model */}
        <div style={{ flex: '1 1 300px' }}>
          <Card hoverEffect={false}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '16px', marginTop: 0, userSelect: 'none' }}>By Model</h3>
            {data.byModel?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byModel} layout="vertical">
                  <CartesianGrid stroke="rgba(148, 148, 176, 0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="modelName" type="category" tick={{ fill: 'var(--text-2)', fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="_sum.totalTokens" name="Tokens" radius={[0, 4, 4, 0]}>
                    {(data.byModel ?? []).map((entry: any, i: number) => (
                      <Cell key={i} fill={MODEL_COLORS[entry.modelName] ?? 'var(--text-3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600 }}>No data</div>}
          </Card>
        </div>
      </div>

      {/* Feature breakdown */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* By feature */}
        <div style={{ flex: '1 1 400px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Usage by Feature</h3>
          </div>
          {(data.byFeature ?? []).map((f: any) => (
            <div key={f.feature} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(228, 228, 240, 0.5)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{f.feature}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, marginTop: '2px' }}>{f._count.id.toLocaleString()} requests</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand)' }}>{f._sum.totalTokens?.toLocaleString() ?? 0} tokens</div>
            </div>
          ))}
          {(!data.byFeature || data.byFeature.length === 0) && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600 }}>No data</div>
          )}
        </div>

        {/* Top users by tokens */}
        <div style={{ flex: '1 1 400px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Top Users by Token Consumption</h3>
          </div>
          {(data.topUsers ?? []).map((u: any, i: number) => (
            <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(228, 228, 240, 0.5)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--brand)', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.user?.fullName ?? 'Unknown'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.user?.email}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand)' }}>{u._sum.totalTokens?.toLocaleString() ?? 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, marginTop: '2px' }}>tokens · ${u._sum.estimatedCostUsd?.toFixed(3)}</div>
              </div>
            </div>
          ))}
          {(!data.topUsers || data.topUsers.length === 0) && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600 }}>No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
