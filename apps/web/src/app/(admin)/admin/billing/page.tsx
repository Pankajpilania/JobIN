'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getBilling } from '@/lib/admin-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Card hoverEffect={false} style={{ padding: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', fontSize: '12px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '4px', fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: p.stroke || p.fill || 'var(--brand)' }} />
          {p.name}: {typeof p.value === 'number' ? `£${p.value.toFixed(2)}` : p.value}
        </div>
      ))}
    </Card>
  );
}

export default function AdminBillingPage() {
  const { getToken } = useAuth();
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then(async token => {
      if (!token) return;
      try {
        const res = await getBilling(token);
        setData(res);
      } catch {
        toast.error('Failed to load billing analytics');
      } finally {
        setLoading(false);
      }
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
      <span>Loading billing telemetry…</span>
    </div>
  );

  if (!data) return (
    <div style={{ padding: '32px', fontSize: '12px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      <span>⚠️</span> Failed to load billing telemetry.
    </div>
  );

  const statusData = (data.subsByStatus ?? []).map((s: any) => ({
    name:  s.status.replace('_', ' '),
    value: s._count.id,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ userSelect: 'none' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          Billing & Revenue
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Revenue tracking, subscription models, and invoice payment logs.
        </p>
      </div>

      {/* KPI Cards row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {[
          { label: 'Total Revenue', value: `£${data.totalRevenue?.toLocaleString() ?? 0}`, colorClass: 'text-emerald-600 dark:text-emerald-400', icon: '💰' },
          { label: 'Total Payments', value: data.totalPayments?.toLocaleString() ?? 0, colorClass: 'text-brand dark:text-brand-mid', icon: '💳' },
          { label: 'Plans Active', value: data.topPlans?.length ?? 0, colorClass: 'text-indigo-600 dark:text-indigo-400', icon: '📦' },
        ].map(({ label, value, icon }) => (
          <Card key={label} hoverEffect={true} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontSize: '18px' }}>{icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)' }}>
              {value}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts split row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Monthly Revenue Trend */}
        <div style={{ flex: '2 1 500px' }}>
          <Card hoverEffect={false}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '16px', marginTop: 0, userSelect: 'none' }}>Monthly Revenue</h3>
            {data.revenueByMonth?.length ? (
              <div style={{ width: '100%', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueByMonth}>
                    <defs>
                      <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148, 148, 176, 0.1)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--brand)" fill="url(#revG)" strokeWidth={2} dot={{ fill: 'var(--brand)', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, userSelect: 'none' }}>
                No revenue details captured yet
              </div>
            )}
          </Card>
        </div>

        {/* Subs by status horizontal bar chart */}
        <div style={{ flex: '1 1 300px' }}>
          <Card hoverEffect={false}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '16px', marginTop: 0, userSelect: 'none' }}>Subscriptions by Status</h3>
            {statusData.length ? (
              <div style={{ width: '100%', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical">
                    <CartesianGrid stroke="rgba(148, 148, 176, 0.1)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-2)', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(129, 138, 248, 0.05)' }} />
                    <Bar dataKey="value" name="Count" fill="var(--brand)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, userSelect: 'none' }}>
                No status records logged
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', userSelect: 'none' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Recent Payments</h3>
        </div>
        
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', color: 'var(--text-1)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Customer</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Amount Paid</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', userSelect: 'none' }}>Plan Package</th>
              <th style={{ padding: '14px 16px', textAlign: 'right', userSelect: 'none' }}>Invoice Date</th>
            </tr>
          </thead>
          <tbody>
            {(data.recentPayments ?? []).slice(0, 15).map((p: any) => (
              <tr
                key={p.id}
                style={{ borderBottom: '1px solid rgba(228, 228, 240, 0.6)', transition: 'var(--transition)' }}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{p.subscription?.user?.fullName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>{p.subscription?.user?.email}</p>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10B981' }}>
                  £{p.amount?.toFixed(2)}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--brand)' }}>
                  {p.subscription?.plan?.name}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>
                  {new Date(p.createdAt).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {(!data.recentPayments || data.recentPayments.length === 0) && (
              <tr>
                <td colSpan={4} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: '12px', userSelect: 'none' }}>
                  No payment events recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
