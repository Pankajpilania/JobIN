import { useState, useEffect, useCallback } from 'react';
import { MSG } from '../shared/messages';
import type { AuthState, DetectedJob, Resume, TailorResult, CoverLetterResult, CoverLetterVariant } from '../shared/types';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'tailor' | 'coverletter' | 'saved';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendMsg<T = any>(type: string, payload?: unknown): Promise<T> {
  return chrome.runtime.sendMessage({ type, payload });
}

function ScoreBar({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: delta >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>
          {before} → {after} ({delta >= 0 ? '+' : ''}{delta})
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${after}%`,
          background: delta >= 0
            ? 'linear-gradient(90deg,#6366f1,#34d399)'
            : 'linear-gradient(90deg,#ef4444,#f97316)',
          borderRadius: 99, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}

// ─── Tailor Tab ───────────────────────────────────────────────────────────────

function TailorTab({
  job, resumes, defaultResumeId,
}: {
  job: DetectedJob | null;
  resumes: Resume[];
  defaultResumeId: string;
}) {
  const [resumeId,  setResumeId]  = useState(defaultResumeId || resumes[0]?.id || '');
  const [jobDesc,   setJobDesc]   = useState(job?.jobDescription ?? '');
  const [jobTitle,  setJobTitle]  = useState(job?.jobTitle ?? '');
  const [company,   setCompany]   = useState(job?.companyName ?? '');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<TailorResult | null>(null);
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState(false);

  const tailor = async () => {
    if (!resumeId || !jobDesc) { setError('Select a resume and ensure job description is loaded'); return; }
    setLoading(true); setError(''); setResult(null);
    const res = await sendMsg<{ result?: TailorResult; error?: string }>(MSG.TAILOR_RESUME, {
      resumeId, jobDescription: jobDesc, jobTitle, companyName: company,
    });
    if (res.error) setError(res.error);
    else           setResult(res.result ?? null);
    setLoading(false);
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.tailoredText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto', padding: '0 0 80px' }}>
      {/* Resume selector */}
      <div className="field">
        <label className="label">Resume to Tailor</label>
        <select className="select" value={resumeId} onChange={e => setResumeId(e.target.value)}>
          <option value="">Choose resume…</option>
          {resumes.map(r => (
            <option key={r.id} value={r.id}>{r.title} {r.isDefault ? '⭐' : ''}</option>
          ))}
        </select>
      </div>

      {/* Job fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="field">
          <label className="label">Job Title</label>
          <input className="input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Auto-detected" />
        </div>
        <div className="field">
          <label className="label">Company</label>
          <input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Auto-detected" />
        </div>
      </div>

      {/* Job description */}
      <div className="field">
        <label className="label">Job Description</label>
        <textarea
          className="textarea"
          value={jobDesc}
          onChange={e => setJobDesc(e.target.value)}
          placeholder="Auto-extracted from the job page, or paste manually…"
          style={{ minHeight: 120, fontSize: 12, fontFamily: 'monospace' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {/* Tailor button */}
      <button className="btn btn-primary btn-full" onClick={tailor} disabled={loading || !resumeId}>
        {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Tailoring…</> : '🪄 Tailor with GPT-4o'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeInUp 0.3s ease' }}>
          {/* Score delta */}
          <ScoreBar label="ATS Score" before={result.scoreBefore} after={result.scoreAfter} />

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Changes Applied', value: result.changesApplied.length, color: '#a78bfa' },
              { label: 'Missing Keywords', value: result.missingKeywords.length, color: '#fbbf24' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'Outfit,sans-serif' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tailored text */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tailored Resume</span>
              <button className="btn btn-sm btn-secondary" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <pre style={{ padding: '10px 12px', fontSize: 11, lineHeight: 1.6, color: 'var(--text-muted)', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {result.tailoredText}
            </pre>
          </div>

          {/* Missing keywords */}
          {result.missingKeywords.length > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', marginBottom: 6, textTransform: 'uppercase' }}>Missing Keywords</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {result.missingKeywords.map(kw => (
                  <span key={kw} className="badge badge-amber">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Changes applied */}
          {result.changesApplied.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Changes Applied</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {result.changesApplied.slice(0, 6).map((c, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'start', gap: 6 }}>
                    <span style={{ color: '#a78bfa', flexShrink: 0, marginTop: 1 }}>→</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cover Letter Tab ─────────────────────────────────────────────────────────

const VARIANTS: { value: CoverLetterVariant; label: string; desc: string }[] = [
  { value: 'STANDARD',       label: 'Standard',      desc: '350-400 words'    },
  { value: 'CONCISE',        label: 'Concise',        desc: '≤250 words'       },
  { value: 'DETAILED',       label: 'Detailed',       desc: '500+ words'       },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager', desc: 'Personalised'     },
];

function CoverLetterTab({
  job, resumes, defaultResumeId,
}: {
  job: DetectedJob | null;
  resumes: Resume[];
  defaultResumeId: string;
}) {
  const [resumeId,      setResumeId]      = useState(defaultResumeId || resumes[0]?.id || '');
  const [jobTitle,      setJobTitle]      = useState(job?.jobTitle ?? '');
  const [company,       setCompany]       = useState(job?.companyName ?? '');
  const [jobDesc,       setJobDesc]       = useState(job?.jobDescription ?? '');
  const [variant,       setVariant]       = useState<CoverLetterVariant>('STANDARD');
  const [hiringManager, setHiringManager] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState<CoverLetterResult | null>(null);
  const [error,         setError]         = useState('');
  const [copied,        setCopied]        = useState(false);

  const generate = async () => {
    if (!resumeId || !jobTitle || !company) { setError('Fill in job title, company, and select a resume'); return; }
    if (!jobDesc || jobDesc.length < 50) { setError('Job description must be at least 50 characters'); return; }
    setLoading(true); setError(''); setResult(null);

    const res = await sendMsg<{ result?: CoverLetterResult; error?: string }>(MSG.GENERATE_COVER_LETTER, {
      resumeId, jobTitle, companyName: company, jobDescription: jobDesc, variant,
      hiringManagerName: variant === 'HIRING_MANAGER' ? hiringManager : undefined,
    });
    if (res.error) setError(res.error);
    else           setResult(res.result ?? null);
    setLoading(false);
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto', padding: '0 0 80px' }}>
      <div className="field">
        <label className="label">Resume</label>
        <select className="select" value={resumeId} onChange={e => setResumeId(e.target.value)}>
          {resumes.map(r => <option key={r.id} value={r.id}>{r.title} {r.isDefault ? '⭐' : ''}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="field">
          <label className="label">Job Title *</label>
          <input className="input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. SWE" />
        </div>
        <div className="field">
          <label className="label">Company *</label>
          <input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme" />
        </div>
      </div>

      {/* Variant selector */}
      <div className="field">
        <label className="label">Letter Style</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {VARIANTS.map(v => (
            <button
              key={v.value}
              onClick={() => setVariant(v.value)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid',
                borderColor: variant === v.value ? 'var(--primary-border)' : 'var(--border)',
                background:  variant === v.value ? 'var(--primary-dim)' : 'var(--bg-card)',
                color: variant === v.value ? 'var(--primary)' : 'var(--text-muted)',
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{v.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hiring manager name (conditional) */}
      {variant === 'HIRING_MANAGER' && (
        <div className="field">
          <label className="label">Hiring Manager Name</label>
          <input className="input" value={hiringManager} onChange={e => setHiringManager(e.target.value)} placeholder="e.g. Sarah Chen" />
        </div>
      )}

      {/* Job description */}
      <div className="field">
        <label className="label">Job Description</label>
        <textarea className="textarea" value={jobDesc} onChange={e => setJobDesc(e.target.value)}
          placeholder="Auto-extracted or paste here…"
          style={{ minHeight: 80, fontSize: 12 }}
        />
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      <button className="btn btn-emerald btn-full" onClick={generate} disabled={loading}>
        {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.2)' }} /> Generating…</> : '✍️ Generate Cover Letter'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeInUp 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className={`badge ${variant === 'CONCISE' ? 'badge-blue' : variant === 'DETAILED' ? 'badge-primary' : variant === 'HIRING_MANAGER' ? 'badge-amber' : 'badge-emerald'}`}>
                {VARIANTS.find(v => v.value === variant)?.label}
              </span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{result.wordCount} words</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm btn-secondary" onClick={copy}>{copied ? '✓' : 'Copy'}</button>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '12px 14px', maxHeight: 360, overflowY: 'auto',
          }}>
            {result.content.split('\n').map((para, i) => (
              para.trim()
                ? <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 10 }}>{para}</p>
                : <div key={i} style={{ height: 4 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab,     setTab]     = useState<Tab>('tailor');
  const [auth,    setAuth]    = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [job,     setJob]     = useState<DetectedJob | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [defaultResumeId, setDefaultResumeId] = useState('');

  useEffect(() => {
    Promise.all([
      sendMsg<{ auth: AuthState | null }>(MSG.GET_AUTH),
      sendMsg<{ job: DetectedJob | null }>(MSG.GET_DETECTED_JOB),
      sendMsg<{ resumes: Resume[] }>(MSG.GET_RESUMES),
      sendMsg<{ settings: any }>(MSG.GET_SETTINGS),
    ]).then(([authRes, jobRes, resumesRes, settingsRes]) => {
      setAuth(authRes?.auth ?? null);
      setJob(jobRes?.job ?? null);
      const rs = resumesRes?.resumes ?? [];
      setResumes(rs);
      const defId = settingsRes?.settings?.defaultResumeId;
      const def   = defId ? rs.find((r: Resume) => r.id === defId) : rs.find((r: Resume) => r.isDefault);
      setDefaultResumeId(def?.id ?? rs[0]?.id ?? '');
    }).finally(() => setLoading(false));
  }, []);

  async function sendMsg<T>(type: string, payload?: unknown): Promise<T> {
    return chrome.runtime.sendMessage({ type, payload });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading JobIN…</div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🔐</div>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 700 }}>Connect your JobIN account</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280 }}>
          Paste your Clerk JWT in the extension options to start tailoring resumes and generating cover letters.
        </p>
        <button className="btn btn-primary" style={{ minWidth: 200 }} onClick={() => chrome.runtime.openOptionsPage()}>
          Open Settings
        </button>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'tailor',       label: 'AI Tailor',     emoji: '🪄' },
    { id: 'coverletter',  label: 'Cover Letter',  emoji: '✍️' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg,rgba(99,102,241,0.08),transparent)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'white',
        }}>J</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 14 }}>JobIN Copilot</div>
          {job && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.jobTitle} @ {job.companyName}
            </div>
          )}
        </div>
        {job && <span className="badge badge-primary">{job.board}</span>}
      </div>

      {/* Job not detected notice */}
      {!job && (
        <div style={{ padding: '8px 16px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.15)', fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⚠️</span>
          No job detected. Paste a job description in the form below.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ flexShrink: 0, padding: '0 16px' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {tab === 'tailor' && (
          <TailorTab job={job} resumes={resumes} defaultResumeId={defaultResumeId} />
        )}
        {tab === 'coverletter' && (
          <CoverLetterTab job={job} resumes={resumes} defaultResumeId={defaultResumeId} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0, padding: '8px 16px', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: 'var(--text-dim)',
      }}>
        <span>{auth.email}</span>
        <button
          style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
