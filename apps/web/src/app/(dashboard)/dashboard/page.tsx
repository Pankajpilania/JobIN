'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/hooks/use-user';
import {
  Send,
  TrendingUp,
  Star,
  Zap,
  Wand2,
  Pen,
  Plus,
  MapPin,
  ChevronRight,
  Award,
  Target,
  Activity,
  BarChart2,
  ArrowUpRight,
} from 'lucide-react';
import { useApplicationStats, useActivityFeed } from '@/hooks/use-applications';
import { useResumes } from '@/hooks/use-resumes';
import type { ApplicationStatus, ActivityItem } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; variant: 'brand' | 'success' | 'neutral' }> = {
  SAVED:                { label: 'Saved',         variant: 'neutral' },
  APPLIED:              { label: 'Applied',        variant: 'brand'   },
  PHONE_SCREEN:         { label: 'Phone Screen',   variant: 'brand'   },
  INTERVIEW:            { label: 'Interview',      variant: 'brand'   },
  TECHNICAL_ASSESSMENT: { label: 'Technical',      variant: 'brand'   },
  FINAL_ROUND:          { label: 'Final Round',    variant: 'brand'   },
  OFFER:                { label: 'Offer 🎉',        variant: 'success' },
  REJECTED:             { label: 'Rejected',       variant: 'neutral' },
  WITHDRAWN:            { label: 'Withdrawn',      variant: 'neutral' },
};

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const target = value;
    const duration = 800;
    const start = Date.now();
    const from = ref.current;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        ref.current = target;
      }
    };

    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display}{suffix}</span>;
}

function DashboardStatCard({
  label,
  value,
  suffix,
  icon: Icon,
  color,
  subText,
  delay,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: any;
  color: { text: string; bg: string };
  subText?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      style={{ flex: '1 1 220px' }}
    >
      <Card hoverEffect={true} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>
              {label}
            </span>
            <p style={{ fontStyle: 'normal', fontSize: '28px', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--text-1)', letterSpacing: '-1px' }}>
              <AnimatedNumber value={value} suffix={suffix} />
            </p>
          </div>
          <div style={{
            display: 'flex',
            height: '40px',
            width: '40px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: color.bg,
            color: color.text,
            border: '1px solid rgba(79, 70, 229, 0.1)'
          }}>
            <Icon style={{ height: '20px', width: '20px' }} />
          </div>
        </div>
        {subText && <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500, margin: 0 }}>{subText}</p>}
      </Card>
    </motion.div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.SAVED;
  const timeAgo = () => {
    const diff = Date.now() - new Date(item.updatedAt).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      padding: '16px',
      transition: 'var(--transition)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{
          display: 'flex',
          height: '36px',
          width: '36px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          backgroundColor: 'var(--brand-light)',
          color: 'var(--brand)',
          fontWeight: 800,
          fontSize: '14px',
          border: '1px solid rgba(79, 70, 229, 0.15)',
          flexShrink: 0
        }}>
          {item.companyName.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.jobTitle}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.companyName}</span>
            {item.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
                <MapPin style={{ height: '12px', width: '12px' }} /> {item.location}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        <Badge variant={cfg.variant}>
          {cfg.label}
        </Badge>
        <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 500 }}>{timeAgo()}</span>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  delay,
}: {
  href: string;
  icon: any;
  label: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      style={{ width: '100%' }}
    >
      <Link href={href} style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          backgroundColor: 'var(--surface)',
          cursor: 'pointer',
          transition: 'var(--transition)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'var(--brand)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'none';
        }}>
          <div style={{
            display: 'flex',
            height: '36px',
            width: '36px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: 'var(--brand-light)',
            color: 'var(--brand)',
            border: '1px solid rgba(79, 70, 229, 0.15)',
            flexShrink: 0
          }}>
            <Icon style={{ height: '18px', width: '18px' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px', margin: '4px 0 0 0', lineHeight: '1.4', fontWeight: 500 }}>
              {description}
            </p>
          </div>
          <ArrowUpRight style={{ height: '16px', width: '16px', color: 'var(--text-3)', flexShrink: 0 }} />
        </div>
      </Link>
    </motion.div>
  );
}

function PipelineBar({ byStatus }: { byStatus: Record<string, number> }) {
  const stages: { key: ApplicationStatus; label: string; color: string }[] = [
    { key: 'SAVED',                label: 'Saved',   color: 'var(--text-3)'   },
    { key: 'APPLIED',              label: 'Applied', color: 'var(--brand-mid)'    },
    { key: 'PHONE_SCREEN',         label: 'Phone',   color: '#818CF8'  },
    { key: 'INTERVIEW',            label: 'Interv',  color: 'var(--brand)'  },
    { key: 'TECHNICAL_ASSESSMENT', label: 'Tech',    color: '#6366F1'  },
    { key: 'FINAL_ROUND',          label: 'Final',   color: '#F59E0B'  },
    { key: 'OFFER',                label: 'Offer',   color: '#10B981' },
    { key: 'REJECTED',             label: 'Rejected',color: '#EF4444'     },
  ];
  const total = Object.values(byStatus ?? {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card hoverEffect={false}>
      <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '16px', marginTop: 0 }}>
        Pipeline Breakdown
      </h3>
      <div style={{ display: 'flex', height: '12px', width: '100%', borderRadius: '999px', overflow: 'hidden', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        {stages.map((s) => {
          const count = byStatus?.[s.key] ?? 0;
          const pct = (count / total) * 100;
          if (!count) return null;
          return (
            <motion.div
              key={s.key}
              title={`${s.label}: ${count}`}
              style={{ backgroundColor: s.color, height: '100%' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', userSelect: 'none' }}>
        {stages
          .filter((s) => (byStatus?.[s.key] ?? 0) > 0)
          .map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>
              <span style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: s.color }} />
              {s.label}: <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{byStatus?.[s.key] ?? 0}</span>
            </div>
          ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: stats } = useApplicationStats();
  const { data: activity } = useActivityFeed();
  const { data: resumes } = useResumes();

  const [sessionName, setSessionName] = useState('');
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const meta = data?.user?.user_metadata;
        setSessionName(meta?.full_name ?? meta?.name ?? '');
      });
  }, []);

  const displayName = user?.fullName || sessionName;
  const firstName = displayName ? displayName.split(' ')[0] : 'candidate';
  const topResume = resumes?.find((r) => r.isDefault) ?? resumes?.[0];
  const atsScore = topResume?.atsScore ?? 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1.2px', color: 'var(--text-1)', margin: 0 }}>
          {greeting}, <span style={{ color: 'var(--brand)' }}>{firstName}</span> 👋
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Here&apos;s your job search overview. Keep the momentum going!
        </p>
      </motion.div>

      {/* Stat cards grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        <DashboardStatCard
          delay={0.05}
          label="Total Applications"
          icon={Send}
          value={stats?.total ?? 0}
          color={{ text: 'var(--brand)', bg: 'var(--brand-light)' }}
          subText={`${stats?.thisWeek ?? 0} applied this week`}
        />
        <DashboardStatCard
          delay={0.1}
          label="Interview Rate"
          icon={TrendingUp}
          value={stats?.interviewRate ?? 0}
          suffix="%"
          color={{ text: 'var(--brand)', bg: 'var(--brand-light)' }}
          subText={stats?.totalApplied ? `${stats.totalApplied} total applied` : 'Apply to unlock stats'}
        />
        <DashboardStatCard
          delay={0.15}
          label="Offer Rate"
          icon={Award}
          value={stats?.offerRate ?? 0}
          suffix="%"
          color={{ text: '#10B981', bg: '#F0FDF4' }}
          subText={
            (stats?.byStatus?.['OFFER'] ?? 0) > 0
              ? `${stats?.byStatus?.['OFFER']} job offer(s)`
              : 'Keep pushing!'
          }
        />
        <DashboardStatCard
          delay={0.2}
          label="Resume Health"
          icon={Star}
          value={atsScore}
          suffix="/100"
          color={{ text: '#F59E0B', bg: '#FEF9C3' }}
          subText={atsScore > 0 ? (topResume?.title ?? 'Default CV') : 'Upload a CV first'}
        />
      </div>

      {/* Pipeline breakdown */}
      {stats && stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <PipelineBar byStatus={stats.byStatus as any} />
        </motion.div>
      )}

      {/* Main dashboard columns */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Recent activity column */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column' }}
        >
          <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}>
                <Activity style={{ height: '18px', width: '18px', color: 'var(--brand)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Recent Activity</h2>
              </div>
              <Link
                href="/tracker"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--brand)',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                View Tracker <ChevronRight style={{ height: '14px', width: '14px' }} />
              </Link>
            </div>

            {!activity || activity.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                border: '1px dashed var(--border)',
                borderRadius: '10px',
                backgroundColor: 'rgba(248, 249, 255, 0.2)',
                textAlign: 'center'
              }}>
                <Target style={{ height: '40px', width: '40px', color: 'var(--text-3)', opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No applications tracked</p>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '280px', margin: '4px auto 16px auto', lineHeight: 1.5, fontWeight: 500 }}>
                  Log your first job application status on the tracker page to get started.
                </p>
                <Link href="/tracker" passHref>
                  <Button variant="ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>
                    <Plus style={{ height: '14px', width: '14px' }} /> Log Application
                  </Button>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                  >
                    <ActivityCard item={item} />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Sidebar Actions Column */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Card */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ width: '100%' }}
          >
            <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}>
                <Zap style={{ height: '18px', width: '18px', color: 'var(--brand)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Quick Actions</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <QuickAction
                  delay={0.35}
                  href="/tracker?add=true"
                  icon={Plus}
                  label="Log Application"
                  description="Record a new vacancy you are pursuing"
                />
                <QuickAction
                  delay={0.4}
                  href="/tailor"
                  icon={Wand2}
                  label="Tailor Resume CV"
                  description="Optimize your bullets with the XYZ formula"
                />
                <QuickAction
                  delay={0.45}
                  href="/cover-letter"
                  icon={Pen}
                  label="Write Cover Letter"
                  description="Generate context-rich custom letters"
                />
              </div>
            </Card>
          </motion.div>

          {/* Status Breakdown Lists */}
          {stats && stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ width: '100%' }}
            >
              <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}>
                  <BarChart2 style={{ height: '18px', width: '18px', color: 'var(--brand)' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Status List</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(STATUS_CONFIG)
                    .filter(([k]) => (stats.byStatus?.[k as ApplicationStatus] ?? 0) > 0)
                    .map(([key, cfg]) => {
                      const count = stats.byStatus?.[key as ApplicationStatus] ?? 0;
                      const pct = Math.round((count / stats.total) * 100);
                      const barColor =
                        cfg.variant === 'success'
                          ? '#10B981'
                          : cfg.variant === 'brand'
                          ? 'var(--brand)'
                          : 'var(--text-3)';
                      return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyText: 'space-between', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-2)' }}>{cfg.label}</span>
                            <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>{count}</span>
                          </div>
                          <div style={{ height: '6px', width: '100%', borderRadius: '999px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <motion.div
                              style={{ height: '100%', borderRadius: '999px', backgroundColor: barColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
