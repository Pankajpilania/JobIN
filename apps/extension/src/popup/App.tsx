import { useState, useEffect, useCallback } from 'react';
import { MSG } from '../shared/messages';
import type { AuthState, DetectedJob, Resume } from '../shared/types';

// ─── Score ring SVG component ─────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  const color =
    score >= 85 ? '#34d399' :
    score >= 70 ? '#60a5fa' :
    score >= 55 ? '#fbbf24' :
    score >= 40 ? '#f97316' : '#f87171';

  const grade =
    score >= 85 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 40 ? 'D' : 'F';

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg className="score-ring-svg" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="score-ring-text">
        <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Outfit,sans-serif', lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{grade}</div>
      </div>
    </div>
  );
}

// ─── Not signed in state ──────────────────────────────────────────────────────

function NotSignedIn() {
  return (
    <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: 36 }}>🔐</div>
      <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 18, fontWeight: 700 }}>Sign in to JobIN</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
        Connect your JobIN account to tailor resumes, generate cover letters, and track applications.
      </p>
      <button
        className="btn btn-primary btn-full"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Go to Settings → Sign In
      </button>
    </div>
  );
}

// ─── Job detected card ────────────────────────────────────────────────────────

function JobCard({ job }: { job: DetectedJob }) {
  return (
    <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Company avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: 'white',
        }}>
          {job.companyName.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.jobTitle}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.companyName}{job.location ? ` · ${job.location}` : ''}
          </div>
        </div>
        <span className="badge badge-primary" style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {job.board.toUpperCase()}
        </span>
      </div>
      {job.salary && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>💷 {job.salary}</div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [auth,    setAuth]    = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [job,     setJob]     = useState<DetectedJob | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      chrome.runtime.sendMessage({ type: MSG.GET_AUTH }),
      chrome.runtime.sendMessage({ type: MSG.GET_DETECTED_JOB }),
      chrome.runtime.sendMessage({ type: MSG.GET_RESUMES }),
    ]).then(([authRes, jobRes, resumesRes]) => {
      setAuth(authRes?.auth ?? null);
      setJob(jobRes?.job ?? null);
      const rs = resumesRes?.resumes ?? [];
      setResumes(rs);
      const def = rs.find((r: Resume) => r.isDefault);
      if (def) setSelectedResume(def.id);
      else if (rs.length) setSelectedResume(rs[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const openSidePanel = () => {
    chrome.runtime.sendMessage({ type: MSG.OPEN_SIDE_PANEL });
    window.close();
  };

  const saveJob = async () => {
    if (!job) return;
    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type:    MSG.SAVE_APPLICATION,
        payload: {
          jobTitle:       job.jobTitle,
          companyName:    job.companyName,
          location:       job.location,
          jobUrl:         job.url,
          status:         'SAVED',
          jobDescription: job.jobDescription,
        },
      });
      setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!auth) return <NotSignedIn />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg,rgba(99,102,241,0.06),transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#312e81"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient>
              <linearGradient id="pa" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" fill="url(#pbg)"/>
            <rect x="8" y="13" width="13" height="2.5" rx="1.25" fill="white" opacity="0.9"/>
            <rect x="8" y="17.5" width="10" height="2.5" rx="1.25" fill="white" opacity="0.75"/>
            <rect x="8" y="22" width="7" height="2.5" rx="1.25" fill="white" opacity="0.6"/>
            <path d="M16 24 L16 10 L22 4" stroke="url(#pa)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="22,4 28,4 22,10" fill="url(#pa)"/>
          </svg>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 15 }}>
            Job<span style={{ background: 'linear-gradient(90deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IN</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{auth.email}</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* ── Job detected ── */}
        {job ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Job Detected
              </span>
              <span className="badge badge-emerald">✓ Auto-extracted</span>
            </div>

            <JobCard job={job} />

            {/* Resume selector */}
            {resumes.length > 0 && (
              <div className="field">
                <label className="label">Compare with Resume</label>
                <select
                  className="select"
                  value={selectedResume}
                  onChange={e => setSelectedResume(e.target.value)}
                >
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} {r.isDefault ? '⭐' : ''} {r.atsScore > 0 ? `(${r.atsScore})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={openSidePanel}
              >
                <span>🪄</span>
                Open Full Panel — Tailor & Cover Letter
              </button>

              <button
                className="btn btn-secondary btn-full"
                onClick={saveJob}
                disabled={saving || saved}
              >
                {saved ? '✓ Saved to Tracker' : saving ? 'Saving…' : '🔖 Save to Job Tracker'}
              </button>
            </div>

            {/* Description preview */}
            {job.jobDescription && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>
                  Description Preview
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
                  maxHeight: 72, overflow: 'hidden',
                  maskImage: 'linear-gradient(180deg,black 60%,transparent)',
                }}>
                  {job.jobDescription.slice(0, 300)}…
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── No job detected ── */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              textAlign: 'center', padding: '20px 0',
              display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
            }}>
              <div style={{ fontSize: 32, lineHeight: 1 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>No job page detected</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Navigate to a job listing on LinkedIn, Indeed, Reed, TotalJobs, or Glassdoor
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={openSidePanel}>
              <span>📋</span> Open Side Panel
            </button>
          </div>
        )}

        {/* ── Quick links footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16,
          paddingTop: 8, borderTop: '1px solid var(--border)',
        }}>
          {[
            { label: 'Options',       fn: () => chrome.runtime.openOptionsPage() },
            { label: 'Job Tracker',   fn: () => chrome.tabs.create({ url: 'http://localhost:3000/tracker' }) },
            { label: 'Dashboard',     fn: () => chrome.tabs.create({ url: 'http://localhost:3000/dashboard' }) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
