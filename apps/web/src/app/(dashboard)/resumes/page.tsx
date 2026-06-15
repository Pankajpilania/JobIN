'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Trash2,
  Star,
  Zap,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Download,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  useResumes,
  useUploadResume,
  useAnalyseResume,
  useDeleteResume,
  useSetDefaultResume,
} from '@/hooks/use-resumes';
import type { Resume } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024,
    s = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${s[i]}`;
}

// ATS score: large circular progress in brand color
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  
  // Brand color representation
  const color = 'var(--brand)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={score > 0 ? offset : circ}
          strokeLinecap="round"
          style={{ transition: 'all 1s ease-out' }}
        />
      </svg>
      <span style={{ position: 'absolute', fontSize: '14px', fontWeight: 800, color: 'var(--brand)' }}>
        {score > 0 ? `${score}` : '—'}
      </span>
    </div>
  );
}

function DropZone() {
  const upload = useUploadResume();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejected) => {
      const err = rejected[0]?.errors[0];
      if (err?.code === 'file-too-large') {
        toast.error('File exceeds 10 MB limit');
      } else if (err?.code === 'file-invalid-type') {
        toast.error('Only PDF and DOCX files are accepted');
      } else {
        toast.error('File rejected — please try again');
      }
    },
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const resume = await upload.mutateAsync(file);
      toast.success('Resume uploaded successfully!');
      setFile(null);
      router.push(`/resumes/${resume.id}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Upload zone: dashed border brand color, centered icon + text */}
      <div
        {...getRootProps()}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          border: '2px dashed var(--brand)',
          padding: '48px',
          textAlign: 'center',
          transition: 'var(--transition)',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isDragActive ? 'rgba(79, 70, 229, 0.08)' : 'rgba(255, 255, 255, 0.5)'
        }}
      >
        <input {...getInputProps()} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            height: '48px',
            width: '48px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            backgroundColor: 'var(--brand-light)',
            color: 'var(--brand)',
            border: '1px solid rgba(79, 70, 229, 0.2)'
          }}>
            <Upload style={{ height: '20px', width: '20px' }} />
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              {isDragActive ? 'Drop to upload CV' : 'Drag & drop your resume CV file'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: '4px 0 0 0' }}>
              PDF or DOCX · maximum 10 MB
            </p>
          </div>
          <Button variant="ghost" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Browse Files
          </Button>
        </div>
      </div>

      {/* Selected file preview */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                display: 'flex',
                height: '40px',
                width: '40px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-light)',
                border: '1px solid rgba(79, 70, 229, 0.2)',
                color: 'var(--brand)',
                flexShrink: 0
              }}>
                <FileText style={{ height: '20px', width: '20px' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              style={{
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                transition: 'var(--transition)'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <Trash2 style={{ height: '18px', width: '18px' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload action button */}
      {file && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            onClick={handleUpload}
            disabled={uploading}
            style={{ width: '100%', padding: '12px' }}
          >
            {uploading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Clock style={{ height: '16px', width: '16px' }} />
                </motion.div>
                Analyzing ATS keyword extraction...
              </>
            ) : (
              <>
                <Upload style={{ height: '16px', width: '16px' }} />
                Upload Resume CV
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function ResumeCard({ resume }: { resume: Resume }) {
  const analyse = useAnalyseResume();
  const deleteR = useDeleteResume();
  const setDefault = useSetDefaultResume();
  const [analysing, setAnalysing] = useState(false);

  const handleAnalyse = async () => {
    setAnalysing(true);
    try {
      await analyse.mutateAsync(resume.id);
      toast.success('ATS analysis complete!');
    } catch (err: any) {
      toast.error(err.message ?? 'Analysis failed.');
    } finally {
      setAnalysing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteR.mutateAsync(resume.id);
      toast.success('Resume deleted.');
    } catch {
      toast.error('Delete failed.');
    }
  };

  const hasAnalysis = resume.atsScore > 0 || !!resume.analysisResult;
  const score = resume.atsScore;
  const grade = resume.analysisResult?.grade ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{ width: '100%' }}
    >
      <Card hoverEffect={true} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
            {/* ATS circular progress in brand color */}
            <ScoreRing score={score} />

            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resume.title}</p>
                {resume.isDefault && (
                  <Badge variant="brand">
                    <Star style={{ height: '10px', width: '10px', fill: 'currentColor' }} /> Default CV
                  </Badge>
                )}
                {grade && (
                  <Badge variant={grade === 'A' || grade === 'B' ? 'success' : 'neutral'}>
                    Grade {grade}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>
                {resume.originalName} · {formatBytes(resume.fileSize)}
              </p>
              {hasAnalysis && resume.analysisResult && (
                <p style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500, margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {resume.analysisResult.summary}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={handleDelete}
            style={{
              color: 'var(--text-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              transition: 'var(--transition)'
            }}
            title="Delete CV"
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-3)';
            }}
          >
            <Trash2 style={{ height: '18px', width: '18px' }} />
          </button>
        </div>

        {/* Actions: tailor/download buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {hasAnalysis && (
            <Link href={`/resumes/${resume.id}`} passHref style={{ textDecoration: 'none' }}>
              <Button variant="primary" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp style={{ height: '12px', width: '12px' }} /> View Score Report
                <ChevronRight style={{ height: '12px', width: '12px' }} />
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            onClick={handleAnalyse}
            disabled={analysing}
            style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {analysing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Zap style={{ height: '12px', width: '12px' }} />
              </motion.div>
            ) : (
              <Zap style={{ height: '12px', width: '12px', color: 'var(--brand)' }} />
            )}
            {analysing ? 'Evaluating...' : hasAnalysis ? 'Re-evaluate' : 'Evaluate ATS'}
          </Button>

          {!resume.isDefault && (
            <Button
              variant="ghost"
              onClick={() => setDefault.mutateAsync(resume.id).then(() => toast.success('Set as default CV')).catch(() => toast.error('Failed to set default'))}
              style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Star style={{ height: '12px', width: '12px' }} /> Set Default
            </Button>
          )}

          {/* Download pdf/docx action buttons */}
          <a
            href={resume.s3Url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', textDecoration: 'none' }}
          >
            <Button variant="ghost" style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download style={{ height: '14px', width: '14px' }} /> Download
            </Button>
          </a>
        </div>
      </Card>
    </motion.div>
  );
}

export default function ResumesPage() {
  const { data: resumes, isLoading } = useResumes();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1.2px', color: 'var(--text-1)', margin: 0 }}>
          <span style={{ color: 'var(--brand)' }}>Resume</span> Manager
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Upload resumes, extract CV details, and check your instant GPT-4o ATS score.
        </p>
      </motion.div>

      {/* Info stripe */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          alignItems: 'start',
          gap: '12px',
          borderRadius: '10px',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          backgroundColor: 'var(--brand-light)',
          padding: '16px'
        }}
      >
        <Zap style={{ height: '18px', width: '18px', color: 'var(--brand)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '12px', color: 'var(--brand-dark)', leadingRelaxed: 1.5, fontWeight: 600, margin: 0 }}>
          ATS evaluation consumes 1 AI credit. Evaluations audit CV structure formatting, keyword density, role relevance, and deliver actionable writing improvements.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DropZone />
      </motion.div>

      {/* CV list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Your Resumes</h2>
          {resumes && resumes.length > 0 && (
            <span style={{
              borderRadius: '999px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-3)'
            }}>
              {resumes.length} file{resumes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: '140px', borderRadius: '10px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : !resumes || resumes.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            border: '1px dashed var(--border)',
            backgroundColor: 'rgba(248, 249, 255, 0.2)',
            padding: '64px 24px',
            textAlign: 'center',
            gap: '12px'
          }}>
            <FileText style={{ height: '40px', width: '40px', color: 'var(--text-3)', opacity: 0.5 }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No CV files uploaded</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, marginTop: '4px', margin: '4px 0 0 0' }}>Upload your first resume file above to begin.</p>
            </div>
          </div>
        ) : (
          <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AnimatePresence mode="popLayout">
              {resumes.map((r) => (
                <ResumeCard key={r.id} resume={r} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
