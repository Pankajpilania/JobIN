'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Pen,
  Copy,
  Download,
  Trash2,
  ChevronDown,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useResumes } from '@/hooks/use-resumes';
import { useGenerateCoverLetter, useCoverLetters, useDeleteCoverLetter } from '@/hooks/use-cover-letters';
import { createClient } from '@/lib/supabase/client';
import type { CoverLetter, CoverLetterListItem, CoverLetterVariant } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const supabase = createClient();
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

async function downloadCoverLetter(content: string, jobTitle: string, id: string, format: 'pdf' | 'docx') {
  if (format === 'pdf') {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) throw new Error('Popup blocked. Please allow popups to export PDF.');
    
    const htmlContent = content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br/>').join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cover_Letter_${id}</title>
          <style>
            body { font-family: 'Georgia', serif; padding: 40px; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; }
            p { margin: 0 0 12px 0; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  } else {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

const VARIANTS: { value: CoverLetterVariant; label: string; desc: string; color: string }[] = [
  { value: 'STANDARD',       label: 'Standard',       desc: '350-400 words · Professional tone',   color: 'brand'   },
  { value: 'CONCISE',        label: 'Concise',         desc: '≤250 words · Punchy & direct',         color: 'success'},
  { value: 'DETAILED',       label: 'Detailed',        desc: '500-600 words · Comprehensive',        color: 'brand' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager',  desc: 'Addressed to a named person',          color: 'brand'  },
];

function CoverLetterListItemCard({
  item,
  onSelect,
  isSelected,
}: {
  item: CoverLetterListItem;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const deleteCL = useDeleteCoverLetter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCL.mutateAsync(item.id);
      toast.success('Deleted cover letter.');
    } catch {
      toast.error('Delete failed.');
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ x: 2 }}
      onClick={onSelect}
      style={{
        cursor: 'pointer',
        borderRadius: '10px',
        border: '1px solid',
        borderColor: isSelected ? 'var(--brand)' : 'var(--border)',
        padding: '16px',
        transition: 'var(--transition)',
        userSelect: 'none',
        backgroundColor: isSelected ? 'var(--brand-light)' : 'var(--surface)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.jobTitle}</p>
            <Badge variant="neutral" style={{ fontSize: '9px', padding: '0px 6px', fontWeight: 700 }}>
              {item.variant.replace('_', ' ')}
            </Badge>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, margin: 0 }}>{item.companyName} · {item.wordCount} words</p>
        </div>
        <button
          onClick={handleDelete}
          style={{
            padding: '6px',
            borderRadius: '6px',
            color: 'var(--text-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-3)';
          }}
        >
          <Trash2 style={{ height: '16px', width: '16px' }} />
        </button>
      </div>
    </motion.div>
  );
}

export default function CoverLetterPage() {
  const { data: resumes } = useResumes();
  const { data: letters } = useCoverLetters();
  const generate = useGenerateCoverLetter();

  const [selectedResumeId,    setSelectedResumeId]    = useState('');
  const [jobTitle,            setJobTitle]            = useState('');
  const [companyName,         setCompanyName]         = useState('');
  const [jobDescription,      setJobDescription]      = useState('');
  const [variant,             setVariant]             = useState<CoverLetterVariant>('STANDARD');
  const [hiringManagerName,   setHiringManagerName]   = useState('');
  const [generated,           setGenerated]           = useState<CoverLetter | null>(null);
  const [selectedHistoryId,   setSelectedHistoryId]   = useState<string | null>(null);
  const [loading,             setLoading]             = useState(false);

  // Sync selected letter from history
  useEffect(() => {
    if (selectedHistoryId && letters) {
      const selected = letters.find(l => l.id === selectedHistoryId);
      if (selected) {
        // Fetch full letter contents
        const fetchLetter = async () => {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (token) {
            const res = await fetch(`${apiBase}/cover-letters/${selectedHistoryId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const fullLetter = await res.json();
              setGenerated(fullLetter);
            }
          }
        };
        fetchLetter();
      }
    } else if (!selectedHistoryId) {
      setGenerated(null);
    }
  }, [selectedHistoryId, letters]);

  const handleGenerate = async () => {
    if (!selectedResumeId) {
      toast.error('Select a resume');
      return;
    }
    if (!jobTitle) {
      toast.error('Enter a job title');
      return;
    }
    if (!companyName) {
      toast.error('Enter a company name');
      return;
    }
    if (!jobDescription || jobDescription.length < 50) {
      toast.error('Job description must be at least 50 characters');
      return;
    }
    if (variant === 'HIRING_MANAGER' && !hiringManagerName) {
      toast.error("Enter the hiring manager's name");
      return;
    }

    setLoading(true);
    try {
      const result = await generate.mutateAsync({
        resumeId: selectedResumeId,
        jobTitle,
        companyName,
        jobDescription,
        variant,
        hiringManagerName: variant === 'HIRING_MANAGER' ? hiringManagerName : undefined,
      });
      setGenerated(result);
      setSelectedHistoryId(null);
      toast.success('Cover letter generated successfully!');
    } catch (err: any) {
      toast.error(err.message ?? 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayLetter = generated;
  const wordCount = displayLetter?.wordCount ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          <span style={{ color: 'var(--brand)' }}>Cover Letter</span> Generator
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Select your CV, paste the job description, choose a writing style, and export a polished cover letter.
        </p>
      </motion.div>

      {/* Grid: Left Panel (Inputs) & Right Panel (Live Preview) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* ─── Left panel: Inputs & Generator Form ─── */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card hoverEffect={false} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {/* Resume selector */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Resume CV *</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedResumeId}
                      onChange={e => setSelectedResumeId(e.target.value)}
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
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Choose a resume CV…</option>
                      {(resumes ?? []).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.title} {r.isDefault ? '⭐' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown style={{ pointerEvents: 'none', position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: 'var(--text-3)' }} />
                  </div>
                </div>

                {/* Job Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title *</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="Senior Software Engineer"
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-2)',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      fontWeight: 500
                    }}
                  />
                </div>

                {/* Company Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-2)',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: 'var(--text-1)',
                      outline: 'none',
                      fontWeight: 500
                    }}
                  />
                </div>
              </div>

              {/* Style Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Letter Style *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {VARIANTS.map(v => {
                    const active = variant === v.value;
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => setVariant(v.value)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: active ? 'var(--brand)' : 'var(--border)',
                          padding: '12px',
                          textAlign: 'left',
                          transition: 'var(--transition)',
                          backgroundColor: active ? 'var(--brand-light)' : 'var(--surface)',
                          cursor: 'pointer',
                          width: '100%',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{v.label}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, lineHeight: 1.3 }}>{v.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Hiring Manager Name */}
              <AnimatePresence>
                {variant === 'HIRING_MANAGER' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                  >
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Hiring Manager Name *
                    </label>
                    <input
                      type="text"
                      value={hiringManagerName}
                      onChange={e => setHiringManagerName(e.target.value)}
                      placeholder="e.g. Sarah Chen"
                      style={{
                        width: '100%',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-2)',
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: 'var(--text-1)',
                        outline: 'none',
                        fontWeight: 500
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Job Description Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Job Description * <span style={{ textTransform: 'lowercase', fontWeight: 500, opacity: 0.6 }}>(paste the full posting text)</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  rows={8}
                  placeholder="Paste the complete job description details here…"
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
                    transition: 'var(--transition)'
                  }}
                />
              </div>

              {/* Generate Action */}
              <Button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <RefreshCw style={{ height: '16px', width: '16px' }} />
                    </motion.div>
                    Generating letter with AI...
                  </>
                ) : (
                  <>
                    <Pen style={{ height: '16px', width: '16px' }} />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* History Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Saved Cover Letters</h2>
              {letters && letters.length > 0 && (
                <span style={{
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-3)'
                }}>
                  {letters.length}
                </span>
              )}
            </div>

            {!letters || letters.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                border: '1px dashed var(--border)',
                backgroundColor: 'rgba(248, 249, 255, 0.2)',
                padding: '48px 24px',
                textAlign: 'center',
                gap: '8px'
              }}>
                <FileText style={{ height: '32px', width: '32px', color: 'var(--text-3)', opacity: 0.4 }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No saved letters</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, marginTop: '2px', margin: '2px 0 0 0' }}>Your generated letters will show up here.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <AnimatePresence mode="popLayout">
                  {letters.map(item => (
                    <CoverLetterListItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedHistoryId === item.id}
                      onSelect={() => setSelectedHistoryId(selectedHistoryId === item.id ? null : item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right panel: Live Preview with paper-style bg ─── */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Preview Output</h2>
            
            {displayLetter ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Paper-style bg container */}
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FAF9F6',
                  padding: '32px',
                  boxShadow: 'var(--shadow-card)',
                  color: '#111111',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}>
                  {/* Date */}
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#666666', margin: 0 }}>
                    {new Date(displayLetter.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                  </p>
                  {/* Subject */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid #E5E5E5', paddingBottom: '16px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#333333', margin: 0 }}>
                      Application for: {displayLetter.jobTitle}
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#666666', margin: 0 }}>
                      Company: {displayLetter.companyName}
                    </p>
                  </div>
                  {/* Contents */}
                  <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, fontFamily: 'Georgia, serif', color: '#222222', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {displayLetter.content.split('\n').map((para, i) => (
                        para.trim() ? (
                          <p key={i} style={{ margin: 0 }}>
                            {para}
                          </p>
                        ) : (
                          <div key={i} style={{ height: '8px' }} />
                        )
                      ))}
                    </div>
                  </div>
                  {/* Bottom details */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E5E5E5', paddingTop: '16px', userSelect: 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {wordCount} Words
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {displayLetter.variant.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Bottom: format selector + export buttons */}
                <Card hoverEffect={false} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                  <Button variant="ghost" onClick={() => navigator.clipboard.writeText(displayLetter.content).then(() => toast.success('Copied letter to clipboard!'))} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <Copy style={{ height: '14px', width: '14px' }} /> Copy
                  </Button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* DOCX Export */}
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          toast.loading('Exporting text...', { id: 'export-cl' });
                          await downloadCoverLetter(displayLetter.content, displayLetter.jobTitle, displayLetter.id, 'docx');
                          toast.success('Downloaded text!', { id: 'export-cl' });
                        } catch (err: any) {
                          toast.error(err.message || 'Export failed', { id: 'export-cl' });
                        }
                      }}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <Download style={{ height: '14px', width: '14px' }} /> Export DOCX
                    </Button>
                    {/* PDF Export */}
                    <Button
                      onClick={async () => {
                        try {
                          toast.loading('Preparing PDF...', { id: 'export-cl' });
                          await downloadCoverLetter(displayLetter.content, displayLetter.jobTitle, displayLetter.id, 'pdf');
                          toast.success('PDF print dialog opened!', { id: 'export-cl' });
                        } catch (err: any) {
                          toast.error(err.message || 'Export failed', { id: 'export-cl' });
                        }
                      }}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <Download style={{ height: '14px', width: '14px' }} /> Export PDF
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--surface-2)', padding: '64px 24px', textAlign: 'center', height: '380px', gap: '8px' }}>
                <FileText style={{ height: '40px', width: '40px', color: 'var(--text-3)', opacity: 0.4 }} />
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No cover letter active</p>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500, maxWidth: '200px', margin: '4px auto 0 auto', lineHeight: 1.5 }}>
                  Fill in the details on the left to write a personalized letter.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
