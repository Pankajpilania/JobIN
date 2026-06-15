import { useState, useEffect, useCallback } from 'react';
import {
  getAuth, setAuth, clearAuth, getSettings, setSettings,
  getCachedResumes, setCachedResumes, getUserProfile, setUserProfile,
  getDefaultResumeId, setDefaultResumeId,
} from '../shared/storage';
import { validateToken, listResumes, getUserProfile as fetchProfile, signInWithEmail, signUpWithEmail } from '../shared/api';
import type { AuthState, ExtensionSettings, Resume, UserProfile, AutofillSettings } from '../shared/types';

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label, desc, checked, onChange,
}: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>}
      </div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="switch-track" />
      </label>
    </label>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function Status({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--emerald)' : 'var(--red)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: ok ? 'var(--emerald)' : 'var(--red)', fontWeight: 600 }}>{text}</span>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function OptionsApp() {
  const [auth,         setAuthState]    = useState<AuthState | null>(null);
  const [settings,     setSettingsState]= useState<ExtensionSettings | null>(null);
  const [resumes,      setResumes]      = useState<Resume[]>([]);
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [loading,      setLoading]      = useState(true);

  // Token input state
  const [tokenInput,   setTokenInput]   = useState('');
  const [tokenStatus,  setTokenStatus]  = useState<'idle' | 'validating' | 'ok' | 'error'>('idle');
  const [tokenError,   setTokenError]   = useState('');

  // Native Auth State
  const [authMode,     setAuthMode]     = useState<'login' | 'signup' | 'token'>('login');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [fullName,     setFullName]     = useState('');
  const [authLoading,  setAuthLoading]  = useState(false);
  const [authError,    setAuthError]    = useState('');

  // Profile editing
  const [profilePhone,   setProfilePhone]   = useState('');
  const [profileLI,      setProfileLI]      = useState('');
  const [profileWeb,     setProfileWeb]     = useState('');
  const [profileLoc,     setProfileLoc]     = useState('');

  // Saved flash
  const [saved, setSaved] = useState(false);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getAuth(),
      getSettings(),
      getCachedResumes(),
      getUserProfile(),
    ]).then(([a, s, r, p]) => {
      setAuthState(a);
      setSettingsState(s);
      setResumes(r ?? []);
      if (p) {
        setProfile(p);
        setProfilePhone(p.phone ?? '');
        setProfileLI(p.linkedin ?? '');
        setProfileWeb(p.website ?? '');
        setProfileLoc(p.location ?? '');
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Token validation & sign-in (Paste Token option) ───────────────────────

  const handleConnect = async () => {
    if (!tokenInput.trim()) { setTokenError('Paste your Supabase token'); return; }
    setTokenStatus('validating');
    setTokenError('');

    try {
      // Temporarily write token to test it
      const testAuth: AuthState = {
        token: tokenInput.trim(),
        userId: '',
        email: '',
        fullName: '',
        expiresAt: Date.now() + 3600_000, // assume 1h
      };
      await setAuth(testAuth);

      const ok = await validateToken();
      if (!ok) throw new Error('Token validation failed');

      // Fetch real user data
      const userProfile = await fetchProfile();
      const fullAuth: AuthState = {
        token:     tokenInput.trim(),
        userId:    userProfile.id,
        email:     userProfile.email,
        fullName:  userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        expiresAt: Date.now() + 3600_000,
      };
      await setAuth(fullAuth);
      setAuthState(fullAuth);

      // Load resumes
      const rs = await listResumes();
      await setCachedResumes(rs);
      setResumes(rs);

      // Default resume
      if (rs.length) {
        const def = rs.find(r => r.isDefault) ?? rs[0];
        await setDefaultResumeId(def.id);
        await setSettingsState(prev => prev ? { ...prev, defaultResumeId: def.id } : prev);
      }

      // Fetch user profile from backend
      try {
        const profileData = await fetchProfile();
        await setUserProfile({
          fullName: profileData.fullName,
          email: profileData.email,
          workHistory: [],
          education: [],
        });
      } catch { /* ignore profile sync if it fails */ }

      setTokenStatus('ok');
      setTokenInput('');
      showSaved();
    } catch (err: any) {
      await clearAuth();
      setAuthState(null);
      setTokenStatus('error');
      setTokenError(err.message ?? 'Invalid token or network error');
    }
  };

  // ── Direct Login / Sign Up Auth Handler ───────────────────────────────────

  const handleNativeAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      let data;
      if (authMode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter email and password');
        }
        data = await signInWithEmail(email.trim(), password);
      } else {
        if (!email.trim() || !password || !fullName.trim()) {
          throw new Error('Please enter all fields (Full Name, Email, Password)');
        }
        data = await signUpWithEmail(email.trim(), password, fullName.trim());
      }

      if (authMode === 'signup' && !data.access_token) {
        setAuthError('Sign up successful! Please check your email to verify your account.');
        setAuthLoading(false);
        return;
      }

      const token = data.access_token;
      const user = data.user;

      const authState: AuthState = {
        token,
        userId:    user.id,
        email:     user.email,
        fullName:  user.user_metadata?.full_name || user.email.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || undefined,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      await setAuth(authState);
      setAuthState(authState);

      // Load resumes
      const rs = await listResumes();
      await setCachedResumes(rs);
      setResumes(rs);

      // Default resume
      if (rs.length) {
        const def = rs.find(r => r.isDefault) ?? rs[0];
        await setDefaultResumeId(def.id);
        await setSettingsState(prev => prev ? { ...prev, defaultResumeId: def.id } : prev);
      }

      // Sync profile from backend
      try {
        const profileData = await fetchProfile();
        const initialProfile = {
          fullName: profileData.fullName,
          email: profileData.email,
          workHistory: [],
          education: [],
        };
        await setUserProfile(initialProfile);
        setProfile(initialProfile);
      } catch { /* ignore profile sync if it fails */ }

      showSaved();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your JobIN account? This will remove all stored credentials.')) return;
    await clearAuth();
    setAuthState(null);
    setResumes([]);
    setTokenStatus('idle');
  };

  // ── Settings update helpers ───────────────────────────────────────────────

  const updateSetting = useCallback(async (key: keyof ExtensionSettings, value: any) => {
    await setSettings({ [key]: value });
    setSettingsState(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  const updateAutofill = useCallback(async (key: keyof AutofillSettings, value: any) => {
    const current = settings?.autofill;
    const updated = { ...current, [key]: value };
    await setSettings({ autofill: updated as AutofillSettings });
    setSettingsState(prev => prev ? { ...prev, autofill: updated as AutofillSettings } : prev);
  }, [settings]);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  // ── Profile save ──────────────────────────────────────────────────────────

  const saveProfile = async () => {
    const updated: UserProfile = {
      ...(profile ?? { fullName: auth?.fullName ?? '', email: auth?.email ?? '', workHistory: [], education: [] }),
      phone:    profilePhone || undefined,
      linkedin: profileLI    || undefined,
      website:  profileWeb   || undefined,
      location: profileLoc   || undefined,
    };
    await setUserProfile(updated);
    setProfile(updated);
    showSaved();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 10 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto', padding: '32px 20px',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: 'white',
        }}>J</div>
        <div>
          <h1 className="font-outfit" style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
            JobIN <span className="gradient-text">Copilot</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Extension Settings</p>
        </div>
        {saved && <span className="badge badge-emerald" style={{ marginLeft: 'auto' }}>✓ Saved</span>}
      </div>

      {/* ── Section 1: Account ── */}
      <Section title="🔐 Account">
        {auth ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* User card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: 'var(--bg-card-2)', borderRadius: 10, border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: 'white',
              }}>
                {auth.fullName.charAt(0).toUpperCase() || auth.email.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{auth.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auth.email}</div>
              </div>
              <Status ok={true} text="Connected" />
            </div>

            <button className="btn btn-secondary" onClick={handleDisconnect} style={{ width: 'fit-content' }}>
              Disconnect Account
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tabs for Auth Mode */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 2, gap: 16 }}>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none', color: authMode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: 13, padding: '6px 0', borderBottom: authMode === 'login' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer'
                }}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none', color: authMode === 'signup' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: 13, padding: '6px 0', borderBottom: authMode === 'signup' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer'
                }}
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              >
                Sign Up
              </button>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none', color: authMode === 'token' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: 13, padding: '6px 0', borderBottom: authMode === 'token' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer', marginLeft: 'auto'
                }}
                onClick={() => { setAuthMode('token'); setAuthError(''); }}
              >
                Advanced Token
              </button>
            </div>

            {authMode === 'token' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Paste your Supabase token from the JobIN web app to connect.
                </div>
                <div className="field">
                  <label className="label">Supabase Access Token</label>
                  <input
                    type="password"
                    className="input"
                    value={tokenInput}
                    onChange={e => { setTokenInput(e.target.value); setTokenStatus('idle'); }}
                    placeholder="eyJhbGciOiJSUzI1NiIs…"
                    onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  />
                </div>
                {tokenStatus === 'error' && (
                  <div style={{ fontSize: 12, color: 'var(--red)' }}>⚠️ {tokenError}</div>
                )}
                {tokenStatus === 'ok' && (
                  <div style={{ fontSize: 12, color: 'var(--emerald)' }}>✓ Connected successfully!</div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleConnect}
                  disabled={tokenStatus === 'validating' || !tokenInput}
                >
                  {tokenStatus === 'validating' ? 'Validating…' : 'Connect Account'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleNativeAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {authMode === 'signup' && (
                  <div className="field">
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                )}
                <div className="field">
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {authError && (
                  <div style={{
                    fontSize: 12,
                    color: authError.includes('successful') ? 'var(--emerald)' : 'var(--red)',
                    background: authError.includes('successful') ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: authError.includes('successful') ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(248,113,113,0.2)'
                  }}>
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={authLoading}
                  style={{ marginTop: 6 }}
                >
                  {authLoading ? 'Authenticating…' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        )}
      </Section>

      {/* ── Section 2: Default Resume ── */}
      {auth && resumes.length > 0 && (
        <Section title="📄 Default Resume">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              This resume will be pre-selected in the popup and side panel when you visit a job page.
            </p>
            <select
              className="select"
              value={settings?.defaultResumeId ?? ''}
              onChange={async e => {
                await updateSetting('defaultResumeId', e.target.value);
                await setDefaultResumeId(e.target.value);
                showSaved();
              }}
            >
              <option value="">Auto-select (highest ATS score)</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.isDefault ? '⭐' : ''} {r.atsScore > 0 ? `(ATS ${r.atsScore})` : ''}
                </option>
              ))}
            </select>
          </div>
        </Section>
      )}

      {/* ── Section 3: Autofill Preferences ── */}
      <Section title="⚡ Autofill Preferences">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <ToggleRow
            label="Enable Autofill" desc="Automatically detect Greenhouse and Lever application forms"
            checked={settings?.autofill?.enabled ?? true}
            onChange={v => updateAutofill('enabled', v)}
          />
          <div className="divider" />
          <ToggleRow label="Fill Name" checked={settings?.autofill?.fillName ?? true} onChange={v => updateAutofill('fillName', v)} />
          <ToggleRow label="Fill Email" checked={settings?.autofill?.fillEmail ?? true} onChange={v => updateAutofill('fillEmail', v)} />
          <ToggleRow label="Fill Phone" checked={settings?.autofill?.fillPhone ?? true} onChange={v => updateAutofill('fillPhone', v)} />
          <ToggleRow
            label="Fill Work History" desc="Paste experience summary into relevant text areas"
            checked={settings?.autofill?.fillWorkHistory ?? true}
            onChange={v => updateAutofill('fillWorkHistory', v)}
          />
          <ToggleRow
            label="Fill Education" desc="Fill degree and institution fields"
            checked={settings?.autofill?.fillEducation ?? true}
            onChange={v => updateAutofill('fillEducation', v)}
          />
          <ToggleRow
            label="Fill Visa / Work Authorisation" desc="Automatically set visa sponsorship fields"
            checked={settings?.autofill?.fillVisaSponsorship ?? false}
            onChange={v => updateAutofill('fillVisaSponsorship', v)}
          />
          {settings?.autofill?.fillVisaSponsorship && (
            <div className="field" style={{ marginTop: 8, paddingLeft: 12 }}>
              <label className="label">Work Authorisation Status</label>
              <select
                className="select"
                value={settings?.autofill?.workAuthorisation ?? 'yes'}
                onChange={e => updateAutofill('workAuthorisation', e.target.value)}
              >
                <option value="yes">Yes — I have the right to work</option>
                <option value="no">No — I require visa sponsorship</option>
                <option value="visa_required">Visa required</option>
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* ── Section 4: Extension Behaviour ── */}
      <Section title="⚙️ Extension Behaviour">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <ToggleRow
            label="Show floating badge" desc="Display a score badge on job listing pages"
            checked={settings?.showBadge ?? true}
            onChange={v => updateSetting('showBadge', v)}
          />
          <ToggleRow
            label="Auto-open side panel" desc="Open the side panel automatically when a job is detected"
            checked={settings?.openSidePanelOnDetect ?? false}
            onChange={v => updateSetting('openSidePanelOnDetect', v)}
          />
        </div>
      </Section>

      {/* ── Section 5: Profile for Autofill ── */}
      {auth && (
        <Section title="👤 Profile for Autofill">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            This data is used locally by the autofill engine to fill in application forms. It is never sent to the JobIN API.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label className="label">Full Name</label>
                <input className="input" value={auth.fullName} readOnly style={{ opacity: 0.6 }} />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" value={auth.email} readOnly style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label className="label">Phone</label>
                <input className="input" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+44 7700 000000" />
              </div>
              <div className="field">
                <label className="label">Location</label>
                <input className="input" value={profileLoc} onChange={e => setProfileLoc(e.target.value)} placeholder="London, UK" />
              </div>
            </div>
            <div className="field">
              <label className="label">LinkedIn URL</label>
              <input className="input" value={profileLI} onChange={e => setProfileLI(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
            </div>
            <div className="field">
              <label className="label">Website / Portfolio</label>
              <input className="input" value={profileWeb} onChange={e => setProfileWeb(e.target.value)} placeholder="https://yoursite.com" />
            </div>

            <button className="btn btn-primary" onClick={saveProfile}>
              Save Profile
            </button>
          </div>
        </Section>
      )}

      {/* ── Section 6: API Configuration ── */}
      <Section title="🔧 API Configuration">
        <div className="field">
          <label className="label">JobIN API URL</label>
          <input
            className="input"
            value={settings?.apiUrl ?? ''}
            onChange={async e => {
              await updateSetting('apiUrl', e.target.value);
            }}
            placeholder="http://localhost:4000/api"
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Change only for production deployment. Default: http://localhost:4000/api
          </p>
        </div>
      </Section>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: 'var(--text-dim)' }}>
        JobIN Copilot v1.0.0 · Manifest V3 · Built with React + Vite
      </div>
    </div>
  );
}
