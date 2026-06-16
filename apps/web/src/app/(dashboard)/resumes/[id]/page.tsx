'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Zap, CheckCircle, AlertTriangle,
  XCircle, Lightbulb, TrendingUp, Download,
  RefreshCw, FileText, Star,
} from 'lucide-react';
import Link from 'next/link';
import { useResume, useAnalyseResume } from '@/hooks/use-resumes';
import type { ATSAnalysis } from '@/types';
import { Button } from '@/components/ui/button';

// ─── Big Score Gauge ──────────────────────────────────────────────────────────

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const size   = 200;
  const r      = 80;
  const circ   = 2 * Math.PI * r;
  // Only draw the top 75% of the circle (semicircle gauge look)
  const arc    = circ * 0.75;
  const offset = arc - (score / 100) * arc;

  const { color, bg, label } =
    score >= 90 ? { color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', label: 'Excellent' } :
    score >= 80 ? { color: 'var(--brand)', bg: 'rgba(79, 70, 229, 0.08)', label: 'Good' } :
    score >= 65 ? { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', label: 'Fair' } :
    score >= 50 ? { color: '#F97316', bg: 'rgba(249, 115, 22, 0.08)', label: 'Poor' } :
                  { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', label: 'Critical' };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '16px',
      backgroundColor: bg,
      border: '1px solid var(--border)',
      padding: '32px'
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--border)" strokeWidth={12}
            strokeDasharray={`${arc} ${circ - arc}`}
            strokeDashoffset={circ * 0.125}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
          {/* Score arc */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={12}
            strokeDasharray={`${arc} ${circ - arc}`}
            strokeDashoffset={offset + circ * 0.125}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: arc + circ * 0.125 }}
            animate={{ strokeDashoffset: offset + circ * 0.125 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>

        {/* Center text */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span
            style={{ fontSize: '48px', fontWeight: 900, color, letterSpacing: '-1.5px' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >
            {score}
          </motion.span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>ATS Score</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, color }}>Grade {grade}</span>
        <span style={{ color: 'var(--text-2)', fontSize: '14px', fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ElementType;
  items: string[];
  variant: 'error' | 'warning' | 'success' | 'info' | 'primary';
  empty?: string;
}

const variantStyles = {
  error:   { color: '#EF4444', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', badgeBg: '#FEE2E2', badgeBorder: '#FCA5A5' },
  warning: { color: '#F59E0B', borderColor: '#FCD34D', backgroundColor: '#FFFBEB', badgeBg: '#FEF3C7', badgeBorder: '#FCD34D' },
  success: { color: '#10B981', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', badgeBg: '#D1FAE5', badgeBorder: '#6EE7B7' },
  info:    { color: '#3B82F6', borderColor: '#93C5FD', backgroundColor: '#EFF6FF', badgeBg: '#DBEAFE', badgeBorder: '#93C5FD' },
  primary: { color: 'var(--brand)', borderColor: '#C7D2FE', backgroundColor: 'var(--brand-light)', badgeBg: '#DDE2FF', badgeBorder: '#C7D2FE' },
};

function Section({ title, icon: Icon, items, variant, empty = 'None found.' }: SectionProps) {
  const s = variantStyles[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: '12px',
        border: '1px solid',
        borderColor: s.borderColor,
        backgroundColor: s.backgroundColor,
        padding: '20px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Icon style={{ height: '18px', width: '18px', flexShrink: 0, color: s.color }} />
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{title}</h3>
        {items.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            borderRadius: '999px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: s.badgeBg,
            borderColor: s.badgeBorder,
            border: '1px solid',
            color: s.color
          }}>
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-3)', fontStyle: 'italic', margin: 0 }}>{empty}</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0, listStyle: 'none' }}>
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}
            >
              <span style={{ marginTop: '7px', height: '6px', width: '6px', flexShrink: 0, borderRadius: '50%', backgroundColor: s.color }} />
              {item}
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumeDetailPage() {
  const params    = useParams<{ id: string }>();
  const router    = useRouter();
  const { data: resume, isLoading } = useResume(params.id ?? null);
  const analyse   = useAnalyseResume();
  const [reanalysing, setReanalysing] = useState(false);

  const analysis: ATSAnalysis | null = resume?.analysisResult ?? null;

  const handleReanalyse = async () => {
    if (!resume) return;
    setReanalysing(true);
    try {
      await analyse.mutateAsync(resume.id);
      toast.success('Re-analysis complete!');
    } catch (err: any) {
      toast.error(err.message ?? 'Analysis failed.');
    } finally {
      setReanalysing(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ height: '32px', width: '192px', borderRadius: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '256px', borderRadius: '16px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '160px', borderRadius: '12px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 24px', textAlign: 'center' }}>
        <XCircle style={{ marginBottom: '12px', height: '48px', width: '48px', color: 'var(--text-3)', opacity: 0.5 }} />
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)' }}>Resume not found</p>
        <Link href="/resumes" style={{ textDecoration: 'none' }}>
          <button style={{ marginTop: '16px', fontSize: '12px', color: 'var(--brand)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>← Back to Resumes</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <button
          onClick={() => router.push('/resumes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: 'var(--text-2)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'var(--transition)'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-2)'}
        >
          <ArrowLeft style={{ height: '16px', width: '16px' }} /> All Resumes
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {resume.s3Url && (
            <a href={resume.downloadUrl || resume.s3Url} download target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download style={{ height: '14px', width: '14px' }} /> Download
              </Button>
            </a>
          )}
          <Button
            onClick={handleReanalyse}
            disabled={reanalysing}
            style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {reanalysing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RefreshCw style={{ height: '14px', width: '14px' }} />
              </motion.div>
            ) : (
              <Zap style={{ height: '14px', width: '14px' }} />
            )}
            {reanalysing ? 'Analysing…' : analysis ? 'Re-analyse' : 'Run ATS Analysis'}
          </Button>
        </div>
      </div>

      {/* Resume meta */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            height: '40px',
            width: '40px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            backgroundColor: 'var(--brand-light)',
            border: '1px solid rgba(79, 70, 229, 0.2)'
          }}>
            <FileText style={{ height: '20px', width: '20px', color: 'var(--brand)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>{resume.title}</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: '2px 0 0 0' }}>{resume.originalName}</p>
          </div>
          {resume.isDefault && (
            <span style={{
              marginLeft: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '999px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#F59E0B'
            }}>
              <Star style={{ height: '10px', width: '10px', fill: 'currentColor' }} /> Default
            </span>
          )}
        </div>
      </motion.div>

      {/* No analysis yet */}
      {!analysis ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            border: '1px dashed var(--border)',
            padding: '80px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--surface)'
          }}
        >
          <TrendingUp style={{ marginBottom: '12px', height: '48px', width: '48px', color: 'var(--text-3)', opacity: 0.25 }} />
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)' }}>No analysis yet</p>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', margin: '4px auto 24px auto', maxWidth: '320px', lineHeight: 1.5, fontWeight: 500 }}>
            Run the GPT-4o ATS analyser to get your resume health score, formatting issues, and keyword suggestions.
          </p>
          <Button
            onClick={handleReanalyse}
            disabled={reanalysing}
            style={{ padding: '12px 24px', fontSize: '14px' }}
          >
            <Zap style={{ height: '16px', width: '16px' }} />
            {reanalysing ? 'Analysing…' : 'Run ATS Analysis'}
          </Button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Score gauge + summary */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ flex: '1 1 200px' }}>
              <ScoreGauge score={analysis.healthScore} grade={analysis.grade} />
            </div>
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px 0' }}>Assessment Summary</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>{analysis.summary}</p>
              </div>
              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Issues Found',      value: analysis.formattingIssues.length,   color: '#EF4444'     },
                  { label: 'Missing Sections',  value: analysis.missingSections.length,    color: '#F59E0B'   },
                  { label: 'Keyword Gaps',       value: analysis.keywordSuggestions.length, color: '#3B82F6'    },
                  { label: 'Improvements',       value: analysis.improvements.length,        color: 'var(--brand)'  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', padding: '12px' }}>
                    <p style={{ fontSize: '24px', fontWeight: 800, color, margin: 0 }}>{value}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, marginTop: '2px', margin: '2px 0 0 0' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detail sections */}
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <Section
              title="Formatting Issues"
              icon={XCircle}
              items={analysis.formattingIssues}
              variant="error"
              empty="✅ No major formatting issues detected."
            />
            <Section
              title="Missing Sections"
              icon={AlertTriangle}
              items={analysis.missingSections}
              variant="warning"
              empty="✅ All key sections present."
            />
            <Section
              title="Keyword Suggestions"
              icon={Lightbulb}
              items={analysis.keywordSuggestions}
              variant="info"
              empty="✅ Good keyword coverage."
            />
            <Section
              title="Strengths"
              icon={CheckCircle}
              items={analysis.strengths}
              variant="success"
              empty="No standout strengths detected yet."
            />
          </div>

          {/* Improvements — full width, ranked */}
          <Section
            title="Improvements (Ranked by Impact)"
            icon={TrendingUp}
            items={analysis.improvements}
            variant="primary"
            empty="No specific improvements needed."
          />
        </div>
      )}
    </div>
  );
}
