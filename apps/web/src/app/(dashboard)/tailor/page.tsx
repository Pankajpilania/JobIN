'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Wand2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  Download,
  Copy,
  RefreshCw,
  ArrowRight,
  Pencil,
  Save,
  FileText,
} from 'lucide-react';
import { useResumes } from '@/hooks/use-resumes';
import { useTailorResume } from '@/hooks/use-tailor';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { TailorResult } from '@/types';
import { Button } from '@/components/ui/button';

// ─── Score delta bar ──────────────────────────────────────────────────────────

function ScoreDelta({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  const isUp = delta >= 0;
  const color = isUp ? '#10B981' : '#EF4444';
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        padding: '20px',
      }}
    >
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          letterSpacing: '0.05em',
          marginBottom: '16px',
          marginTop: 0,
        }}
      >
        Estimated Role Alignment
      </h3>
      <p
        style={{ margin: '-8px 0 14px', color: 'var(--text-3)', fontSize: '11px', lineHeight: 1.5 }}
      >
        AI estimate based on the supplied job description and resume evidence. It is not an employer
        ATS score or hiring prediction.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Before */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-3)', margin: 0 }}>
            {before}
          </p>
          <p
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--text-3)',
              opacity: 0.6,
              margin: '2px 0 0 0',
            }}
          >
            BEFORE
          </p>
        </div>

        {/* Arrow + delta */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '999px',
              padding: '2px 10px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: color,
            }}
          >
            <TrendIcon style={{ height: '14px', width: '14px' }} />
            {isUp ? '+' : ''}
            {delta}
          </div>
          {/* Bars */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                borderRadius: '999px',
                backgroundColor: 'var(--text-3)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${before}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                borderRadius: '999px',
                backgroundColor: color,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${after}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>

        {/* After */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: color, margin: 0 }}>{after}</p>
          <p
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--text-3)',
              opacity: 0.6,
              margin: '2px 0 0 0',
            }}
          >
            AFTER
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Keyword highlighter ──────────────────────────────────────────────────────

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  const highlighted = useMemo(() => {
    if (!keywords.length) return text;
    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    const parts = text.split(pattern);
    return parts.map((part, i) => {
      const _isMatch = pattern.test(part);
      pattern.lastIndex = 0; // reset
      if (keywords.some((k) => k.toLowerCase() === part.toLowerCase())) {
        return (
          <mark
            key={i}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.25)',
              color: '#3B82F6',
              borderRadius: '4px',
              padding: '0 2px',
              fontWeight: 600,
              fontStyle: 'normal',
            }}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  }, [text, keywords]);

  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        lineHeight: 1.6,
        color: 'var(--text-2)',
      }}
    >
      {highlighted}
    </pre>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TailorPage() {
  const { data: resumes } = useResumes();
  const tailor = useTailorResume();
  const { getToken } = useAuth();

  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designTemplate, setDesignTemplate] = useState<
    'modern' | 'minimal' | 'technical' | 'executive' | 'graduate'
  >('modern');
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4');
  const [result, setResult] = useState<TailorResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | 'latex' | null>(null);
  const [activeTab, setActiveTab] = useState<'tailored' | 'original'>('tailored');
  const [loading, setLoading] = useState(false);

  // Collect all job-description keywords (simple word list, lowercased, deduplicated)
  const jdKeywords = useMemo(() => {
    if (!result) return [];
    return Object.keys(result.keywordDensity);
  }, [result]);

  const originalText = result?.originalText ?? '';
  const report = result?.tailoringReport;
  const requirements = report?.requirements ?? [];
  const demonstratedCount = requirements.filter((item) => item.status === 'demonstrated').length;
  const transferableCount = requirements.filter((item) => item.status === 'transferable').length;
  const missingCount = requirements.filter((item) => item.status === 'missing').length;

  const handleTailor = async () => {
    if (!selectedResumeId) {
      toast.error('Select a resume first');
      return;
    }
    if (!jobDescription || jobDescription.length < 50) {
      toast.error('Job description must be at least 50 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await tailor.mutateAsync({
        resumeId: selectedResumeId,
        jobDescription,
        jobTitle,
        companyName,
        designTemplate,
        pageSize,
      });
      setResult(data);
      setEditedText(data.tailoredText);
      setIsEditing(false);
      setActiveTab('tailored');
      toast.success(
        'Tailoring complete. Review the changes and missing keywords before exporting.',
      );
    } catch (err: any) {
      toast.error(err.message ?? 'Tailoring failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard
      .writeText(editedText || result.tailoredText)
      .then(() => toast.success('Copied to clipboard!'));
  };

  const saveEdits = async () => {
    if (!selectedResumeId || !result || editedText.trim().length < 50) {
      toast.error('Resume text must contain at least 50 characters');
      return;
    }
    setSavingEdits(true);
    try {
      const token = await getToken();
      const saved = await apiClient.patch<{
        versionId: string;
        tailoredText: string;
        tailoringReport?: TailorResult['tailoringReport'];
      }>(
        `/resumes/${selectedResumeId}/versions/${result.versionId}`,
        { tailoredContent: editedText },
        token ?? undefined,
      );
      setResult({
        ...result,
        tailoredText: saved.tailoredText,
        tailoringReport: saved.tailoringReport,
      });
      setEditedText(saved.tailoredText);
      setIsEditing(false);
      toast.success('Your edits are saved to this resume version');
    } catch (err: any) {
      toast.error(err.message || 'Could not save resume edits');
    } finally {
      setSavingEdits(false);
    }
  };

  const downloadExport = async (format: 'pdf' | 'docx' | 'latex') => {
    if (!selectedResumeId || !result) return;
    if (isEditing) {
      toast.error('Save or cancel your draft edits before exporting');
      return;
    }
    try {
      setExporting(format);
      const labels = { pdf: 'PDF', docx: 'Word document', latex: 'LaTeX source' };
      toast.loading(`Preparing ${labels[format]} download...`, { id: 'resume-export' });
      const token = await getToken();
      const query = new URLSearchParams({
        versionId: result.versionId,
        template: designTemplate,
        pageSize,
      });
      const { blob, filename, pdfEngine } = await apiClient.download(
        `/resumes/${selectedResumeId}/export/${format}?${query.toString()}`,
        token ?? undefined,
      );
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename || `Tailored_Resume.${format === 'latex' ? 'tex' : format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      const engineNote =
        format === 'pdf' && pdfEngine === 'tectonic'
          ? ' (compiled from LaTeX)'
          : format === 'pdf' && pdfEngine === 'pdfkit-fallback'
            ? ' (native renderer; LaTeX compiler unavailable or failed)'
            : '';
      toast.success(`${labels[format]} downloaded${engineNote}`, { id: 'resume-export' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to download resume', { id: 'resume-export' });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: 'var(--text-1)',
            margin: 0,
            letterSpacing: '-1.2px',
          }}
        >
          <span style={{ color: 'var(--brand)' }}>Resume</span> Tailor
        </h1>
        <p
          style={{
            marginTop: '8px',
            color: 'var(--text-2)',
            fontSize: '14px',
            fontWeight: 500,
            margin: '8px 0 0 0',
          }}
        >
          Paste a job description to focus your resume on relevant experience, keep your claims
          factual, and review missing keywords before exporting an ATS-friendly copy.
        </p>
      </motion.div>

      {/* Input panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          borderRadius: '16px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {/* Resume select */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Select Resume *
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                style={{
                  width: '100%',
                  appearance: 'none',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: 'var(--text-1)',
                  outline: 'none',
                  transition: 'var(--transition)',
                }}
              >
                <option value="">Choose a resume…</option>
                {(resumes ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.isDefault ? '⭐' : ''} {r.atsScore > 0 ? `(${r.atsScore})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: '16px',
                  width: '16px',
                  color: 'var(--text-3)',
                }}
              />
            </div>
          </div>

          {/* Job title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                padding: '12px 16px',
                fontSize: '14px',
                color: 'var(--text-1)',
                outline: 'none',
                transition: 'var(--transition)',
              }}
            />
          </div>

          {/* Company */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Company
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                padding: '12px 16px',
                fontSize: '14px',
                color: 'var(--text-1)',
                outline: 'none',
                transition: 'var(--transition)',
              }}
            />
          </div>

          {/* Output design */}
          <div>
            <label
              htmlFor="resume-template"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Resume design
            </label>
            <select
              id="resume-template"
              value={designTemplate}
              onChange={(event) => setDesignTemplate(event.target.value as typeof designTemplate)}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                padding: '12px 16px',
                fontSize: '14px',
                color: 'var(--text-1)',
              }}
            >
              <option value="modern">Modern professional</option>
              <option value="minimal">Minimal</option>
              <option value="technical">Technical</option>
              <option value="executive">Executive</option>
              <option value="graduate">Graduate</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="resume-paper-size"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Page size
            </label>
            <select
              id="resume-paper-size"
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value as typeof pageSize)}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                padding: '12px 16px',
                fontSize: '14px',
                color: 'var(--text-1)',
              }}
            >
              <option value="A4">A4</option>
              <option value="LETTER">US Letter</option>
            </select>
          </div>

          {/* Job description */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Job Description *{' '}
              <span style={{ opacity: 0.6, fontWeight: 500 }}>(paste the full posting)</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={10}
              placeholder="Paste the complete job description here — include responsibilities, requirements, and qualifications…"
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                padding: '16px',
                fontSize: '14px',
                color: 'var(--text-1)',
                outline: 'none',
                fontFamily: 'monospace',
                resize: 'none',
                transition: 'var(--transition)',
              }}
            />
            <p
              style={{
                marginTop: '4px',
                textAlign: 'right',
                fontSize: '11px',
                color: 'var(--text-3)',
                fontWeight: 600,
              }}
            >
              {jobDescription.length} chars
            </p>
          </div>
        </div>

        {/* Tailor button */}
        <Button
          onClick={handleTailor}
          disabled={loading}
          style={{ width: '100%', padding: '16px', fontSize: '15px' }}
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <RefreshCw style={{ height: '18px', width: '18px' }} />
              </motion.div>
              GPT-4o is tailoring your resume…
            </>
          ) : (
            <>
              <Wand2 style={{ height: '18px', width: '18px' }} />
              Tailor My Resume with AI
            </>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* Score delta */}
            <ScoreDelta
              before={result.scoreBefore}
              after={report?.matchAssessment.estimatedMatchPercent || result.scoreAfter}
            />

            {/* Stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                { label: 'Job Keywords', value: jdKeywords.length, color: '#3B82F6' },
                {
                  label: 'Unmet Requirements',
                  value: result.missingKeywords.length,
                  color: '#EF4444',
                },
                {
                  label: 'Changes Applied',
                  value: result.changesApplied.length,
                  color: 'var(--brand)',
                },
                { label: 'AI Credits Used', value: '1', color: '#F59E0B' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    padding: '16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '24px', fontWeight: 800, color, margin: 0 }}>{value}</p>
                  <p
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-3)',
                      margin: '4px 0 0 0',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {report && (
              <section
                aria-labelledby="tailoring-report-title"
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  background: 'var(--surface)',
                  padding: '20px',
                  display: 'grid',
                  gap: '18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <FileText
                    style={{ width: 19, height: 19, color: 'var(--brand)', marginTop: 2 }}
                  />
                  <div>
                    <h2
                      id="tailoring-report-title"
                      style={{ margin: 0, fontSize: '16px', color: 'var(--text-1)' }}
                    >
                      Job requirements and evidence
                    </h2>
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>
                      {report.matchAssessment.summary ||
                        'Role alignment estimated from resume evidence.'}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {[
                    { label: 'Direct evidence', value: demonstratedCount, color: '#047857' },
                    { label: 'Transferable', value: transferableCount, color: '#1D4ED8' },
                    { label: 'Needs review', value: missingCount, color: '#B45309' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        background: 'var(--surface-2)',
                      }}
                    >
                      <strong style={{ color: item.color, fontSize: '20px' }}>{item.value}</strong>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 2,
                          color: 'var(--text-2)',
                          fontSize: '11px',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: '9px' }}>
                  {requirements.slice(0, 14).map((item, index) => {
                    const statusColor =
                      item.status === 'demonstrated'
                        ? '#047857'
                        : item.status === 'transferable'
                          ? '#1D4ED8'
                          : '#B45309';
                    return (
                      <article
                        key={`${item.requirement}-${index}`}
                        style={{
                          padding: '12px 14px',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <strong style={{ fontSize: '13px', color: 'var(--text-1)' }}>
                            {item.requirement}
                          </strong>
                          <span
                            style={{
                              color: statusColor,
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {item.status}
                          </span>
                          <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>
                            {item.category.replaceAll('_', ' ')}
                          </span>
                        </div>
                        {item.sourceEvidence && (
                          <p
                            style={{
                              margin: '7px 0 0',
                              color: 'var(--text-2)',
                              fontSize: '12px',
                              lineHeight: 1.5,
                            }}
                          >
                            Resume evidence: “{item.sourceEvidence}”
                          </p>
                        )}
                        {item.explanation && (
                          <p
                            style={{
                              margin: '4px 0 0',
                              color: 'var(--text-3)',
                              fontSize: '11px',
                              lineHeight: 1.5,
                            }}
                          >
                            {item.explanation}
                          </p>
                        )}
                      </article>
                    );
                  })}
                  {requirements.length > 14 && (
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '11px' }}>
                      Showing 14 of {requirements.length} mapped requirements.
                    </p>
                  )}
                </div>

                {report.evidenceMap.length > 0 && (
                  <details style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        color: 'var(--brand)',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      Trace tailored claims to source evidence ({report.evidenceMap.length})
                    </summary>
                    <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                      {report.evidenceMap.slice(0, 20).map((entry, index) => (
                        <div
                          key={`${entry.tailoredClaim}-${index}`}
                          style={{ fontSize: '11px', lineHeight: 1.55 }}
                        >
                          <strong style={{ color: 'var(--text-1)' }}>Tailored: </strong>
                          <span style={{ color: 'var(--text-2)' }}>{entry.tailoredClaim}</span>
                          <br />
                          <strong style={{ color: 'var(--text-1)' }}>Source: </strong>
                          <span style={{ color: 'var(--text-3)' }}>{entry.sourceEvidence}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {report.matchAssessment.caveats.length > 0 && (
                  <p
                    style={{ margin: 0, color: 'var(--text-3)', fontSize: '11px', lineHeight: 1.5 }}
                  >
                    Review: {report.matchAssessment.caveats.join(' ')}
                  </p>
                )}

                {result.resumeProfile && (
                  <details style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        color: 'var(--brand)',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      Review extracted resume profile
                    </summary>
                    <div
                      style={{ display: 'grid', gap: '8px', marginTop: '12px', fontSize: '12px' }}
                    >
                      {result.resumeProfile.name && (
                        <p style={{ margin: 0 }}>
                          <b>Name:</b> {result.resumeProfile.name}
                        </p>
                      )}
                      {result.resumeProfile.emails.length > 0 && (
                        <p style={{ margin: 0 }}>
                          <b>Email:</b> {result.resumeProfile.emails.join(', ')}
                        </p>
                      )}
                      {result.resumeProfile.phones.length > 0 && (
                        <p style={{ margin: 0 }}>
                          <b>Phone:</b> {result.resumeProfile.phones.join(', ')}
                        </p>
                      )}
                      {result.resumeProfile.urls.length > 0 && (
                        <p style={{ margin: 0, overflowWrap: 'anywhere' }}>
                          <b>URLs:</b> {result.resumeProfile.urls.join(' | ')}
                        </p>
                      )}
                      {result.resumeProfile.experience.length > 0 && (
                        <p style={{ margin: 0 }}>
                          <b>Experience:</b>{' '}
                          {result.resumeProfile.experience
                            .map((entry) =>
                              [entry.employer, entry.role, entry.dates].filter(Boolean).join(' - '),
                            )
                            .join('; ')}
                        </p>
                      )}
                      {result.resumeProfile.education.length > 0 && (
                        <p style={{ margin: 0 }}>
                          <b>Education:</b> {result.resumeProfile.education.join('; ')}
                        </p>
                      )}
                      {result.resumeProfile.certifications.length > 0 && (
                        <p style={{ margin: 0 }}>
                          <b>Certifications:</b> {result.resumeProfile.certifications.join('; ')}
                        </p>
                      )}
                      <p style={{ margin: 0, color: 'var(--text-3)' }}>
                        Confirm names, dates, links, and other extracted facts before sending
                        applications.
                      </p>
                    </div>
                  </details>
                )}
              </section>
            )}

            {/* Main result: 2-col layout */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {/* Left — tailored text */}
              <div
                style={{
                  flex: '2 1 500px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  {(['tailored', 'original'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: activeTab === tab ? 'var(--brand)' : 'var(--text-3)',
                        borderBottom:
                          activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                        transition: 'var(--transition)',
                      }}
                    >
                      {tab === 'tailored' ? '✨ Tailored' : '📄 Original'}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '20px', height: '480px', overflowY: 'auto' }}>
                  {activeTab === 'tailored' ? (
                    isEditing ? (
                      <textarea
                        aria-label="Edit tailored resume text"
                        value={editedText}
                        onChange={(event) => setEditedText(event.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '440px',
                          resize: 'vertical',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px',
                          background: 'var(--surface)',
                          color: 'var(--text-1)',
                          font: '13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                      />
                    ) : (
                      <HighlightedText
                        text={editedText || result.tailoredText}
                        keywords={jdKeywords}
                      />
                    )
                  ) : originalText ? (
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'sans-serif',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: 'var(--text-2)',
                        margin: 0,
                      }}
                    >
                      {originalText}
                    </pre>
                  ) : (
                    <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                      Original resume text is unavailable for this version. Upload the source again
                      to compare it.
                    </p>
                  )}
                </div>

                {/* Action bar */}
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        disabled={savingEdits}
                        onClick={() => {
                          setEditedText(result.tailoredText);
                          setIsEditing(false);
                        }}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={savingEdits}
                        onClick={saveEdits}
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Save style={{ width: 14, height: 14 }} />
                        {savingEdits ? 'Saving…' : 'Save edits'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActiveTab('tailored');
                        setIsEditing(true);
                      }}
                      style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Pencil style={{ width: 14, height: 14 }} /> Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={copyToClipboard}
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Copy style={{ height: '14px', width: '14px' }} /> Copy Text
                  </Button>
                  <button
                    disabled={Boolean(exporting)}
                    onClick={() => downloadExport('pdf')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      border: '1px solid #FCA5A5',
                      backgroundColor: '#FEF2F2',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#EF4444',
                      cursor: exporting ? 'wait' : 'pointer',
                      opacity: exporting ? 0.65 : 1,
                      transition: 'var(--transition)',
                    }}
                  >
                    <Download style={{ height: '14px', width: '14px' }} />{' '}
                    {exporting === 'pdf' ? 'Preparing…' : 'PDF'}
                  </button>
                  <button
                    disabled={Boolean(exporting)}
                    onClick={() => downloadExport('docx')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      border: '1px solid #93C5FD',
                      backgroundColor: '#EFF6FF',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#3B82F6',
                      cursor: exporting ? 'wait' : 'pointer',
                      opacity: exporting ? 0.65 : 1,
                      transition: 'var(--transition)',
                    }}
                  >
                    <Download style={{ height: '14px', width: '14px' }} />{' '}
                    {exporting === 'docx' ? 'Preparing…' : 'Word'}
                  </button>
                  <button
                    disabled={Boolean(exporting)}
                    onClick={() => downloadExport('latex')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-2)',
                      cursor: exporting ? 'wait' : 'pointer',
                      opacity: exporting ? 0.65 : 1,
                      transition: 'var(--transition)',
                    }}
                  >
                    <Download style={{ height: '14px', width: '14px' }} />{' '}
                    {exporting === 'latex' ? 'Preparing…' : 'LaTeX'}
                  </button>
                </div>
              </div>

              {/* Right sidebar */}
              <div
                style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* Changes applied */}
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #C7D2FE',
                    backgroundColor: 'var(--brand-light)',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    <CheckCircle style={{ height: '16px', width: '16px', color: 'var(--brand)' }} />
                    <h3
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--brand-dark)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: 0,
                      }}
                    >
                      Changes Applied
                    </h3>
                  </div>
                  <ul
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: 0,
                      margin: 0,
                      listStyle: 'none',
                    }}
                  >
                    {result.changesApplied.slice(0, 8).map((change, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          fontSize: '12px',
                          color: 'var(--brand-dark)',
                          fontWeight: 500,
                        }}
                      >
                        <ArrowRight
                          style={{
                            marginTop: '2px',
                            height: '12px',
                            width: '12px',
                            flexShrink: 0,
                            color: 'var(--brand)',
                          }}
                        />
                        {change}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Missing keywords */}
                {result.missingKeywords.length > 0 && (
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #FCD34D',
                      backgroundColor: '#FFFBEB',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      <AlertCircle style={{ height: '16px', width: '16px', color: '#F59E0B' }} />
                      <h3
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#A16207',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          margin: 0,
                        }}
                      >
                        Missing Keywords
                      </h3>
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        color: '#A16207',
                        opacity: 0.8,
                        marginBottom: '8px',
                        margin: '0 0 8px 0',
                      }}
                    >
                      Only add a gap if you have real experience to support it. Otherwise, use it to
                      guide your preparation.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {result.missingKeywords.map((kw, i) => (
                        <span
                          key={i}
                          style={{
                            borderRadius: '999px',
                            backgroundColor: '#FEF3C7',
                            border: '1px solid #FCD34D',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#A16207',
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyword density */}
                {Object.keys(result.keywordDensity).length > 0 && (
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #93C5FD',
                      backgroundColor: '#EFF6FF',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      <Lightbulb style={{ height: '16px', width: '16px', color: '#3B82F6' }} />
                      <h3
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1E40AF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          margin: 0,
                        }}
                      >
                        Keyword Density
                      </h3>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                      }}
                    >
                      {Object.entries(result.keywordDensity)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 12)
                        .map(([kw, count]) => (
                          <div
                            key={kw}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#1E40AF',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {kw}
                            </span>
                            <span
                              style={{
                                borderRadius: '999px',
                                backgroundColor: '#DBEAFE',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#1E40AF',
                              }}
                            >
                              {count}×
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            border: '1px dashed var(--border)',
            padding: '64px 24px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <Wand2 style={{ height: '40px', width: '40px', color: 'var(--text-3)', opacity: 0.2 }} />
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>
            Select a resume and paste a job description
          </p>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-3)',
              marginTop: '4px',
              margin: '4px 0 0 0',
              fontWeight: 500,
            }}
          >
            AI will tailor your resume to this role, show what evidence supports each match, and
            flag gaps for your review.
          </p>
        </motion.div>
      )}
    </div>
  );
}
