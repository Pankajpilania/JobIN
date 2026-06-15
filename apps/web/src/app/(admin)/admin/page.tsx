'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getMetrics } from '@/lib/admin-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

function StatCard({
  label, value, sub, colorClass = '', icon,
}: { label: string; value: string | number; sub?: string; colorClass?: string; icon: string }) {
  return (
    <Card hoverEffect={true} style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1 1 220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: '18px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', marginTop: 0, userSelect: 'none' }}>
      {children}
    </h2>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Card hoverEffect={false} style={{ padding: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', fontSize: '12px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '4px', fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: p.stroke || p.fill || 'var(--brand)' }} />
          {p.name}: {p.value}
        </div>
      ))}
    </Card>
  );
}

const PIE_COLORS = ['#4F46E5', '#16A34A', '#818CF8', '#EF4444'];

export default function AdminDashboardPage() {
  const { getToken } = useAuth();
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) { setError('Not authenticated'); return; }
        const metrics = await getMetrics(token);
        setData(metrics);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-3)', fontWeight: 600, fontSize: '14px' }}>
      <RefreshCw style={{ height: '20px', width: '20px', animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
      <span>Loading system metrics…</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: '32px', fontSize: '12px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      <span>⚠️</span> {error} — Verify that your user account has administrative permissions.
    </div>
  );

  const subsForPie = [
    { name: 'Active Subscriptions', value: data.activeSubscriptions },
    { name: 'New Users (30d)', value: data.newUsersMonth },
    { name: 'AI Requests', value: Math.min(data.totalAIRequests, 9999) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ userSelect: 'none' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          Admin <span style={{ color: 'var(--brand)' }}>Dashboard</span>
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Platform health metrics and operations telemetry at a glance.
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        <StatCard label="Total Users" value={data.totalUsers.toLocaleString()} icon="👤" />
        <StatCard label="Active (30d)" value={data.activeUsers.toLocaleString()} icon="🟢" colorClass="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="MRR" value={`£${data.mrr.toLocaleString()}`} icon="💰" colorClass="text-brand dark:text-brand-mid" sub={`ARR £${data.arr.toLocaleString()}`} />
        <StatCard label="AI Requests" value={data.totalAIRequests.toLocaleString()} icon="🤖" colorClass="text-indigo-600 dark:text-indigo-400" sub={`$${data.totalAICostUsd} total cost`} />
        <StatCard label="Subscriptions" value={data.activeSubscriptions} icon="💳" />
        <StatCard label="New Users (30d)" value={data.newUsersMonth} icon="✨" colorClass="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Churn Rate" value={`${data.churnRate}%`} icon="📉" colorClass={data.churnRate > 5 ? 'text-rose-500' : 'text-emerald-500'} sub="last 30 days" />
        <StatCard label="AI Cost" value={`$${data.totalAICostUsd}`} icon="⚡" colorClass="text-amber-500" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Revenue by month */}
        <div style={{ flex: '2 1 500px' }}>
          <Card hoverEffect={false}>
            <SectionTitle>💰 Revenue by Month</SectionTitle>
            {data.revenueByMonth?.length ? (
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueByMonth}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148, 148, 176, 0.1)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue (£)" stroke="var(--brand)" fill="url(#revGrad)" strokeWidth={2} dot={{ fill: 'var(--brand)', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, userSelect: 'none' }}>
                No subscription billing telemetry yet
              </div>
            )}
          </Card>
        </div>

        {/* Subscription breakdown pie */}
        <div style={{ flex: '1 1 300px' }}>
          <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <SectionTitle>📊 Overview</SectionTitle>
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subsForPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {subsForPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend formatter={(v) => <span style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 700, marginLeft: '4px' }}>{v}</span>} iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* User growth */}
        <div style={{ flex: '1 1 400px' }}>
          <Card hoverEffect={false}>
            <SectionTitle>👥 New Users — Last 7 Days</SectionTitle>
            {data.userGrowth?.length ? (
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.userGrowth}>
                    <CartesianGrid stroke="rgba(148, 148, 176, 0.1)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-3)', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(129, 138, 248, 0.05)' }} />
                    <Bar dataKey="count" name="New Users" fill="var(--brand)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, userSelect: 'none' }}>
                No registration logs inside last 7 days
              </div>
            )}
          </Card>
        </div>

        {/* Platform info card */}
        <div style={{ flex: '1 1 400px' }}>
          <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionTitle>⚙️ Platform Diagnostics</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid rgba(228, 228, 240, 0.4)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-2)' }}>Database Service</span>
                  <Badge variant="success">ONLINE</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyText: 'space-between', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid rgba(228, 228, 240, 0.4)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-2)' }}>Clerk Auth Sync</span>
                  <Badge variant="success">HEALTHY</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyText: 'space-between', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-2)' }}>PDF Parser S3 Endpoint</span>
                  <Badge variant="success">ONLINE</Badge>
                </div>
              </div>
            </div>
            
            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', paddingTop: '16px', borderTop: '1px solid rgba(228, 228, 240, 0.4)', marginTop: '16px', userSelect: 'none' }}>
              Platform Engine Version v1.0.0-Beta
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
