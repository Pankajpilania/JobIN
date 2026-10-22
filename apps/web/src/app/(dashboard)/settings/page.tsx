'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  User,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Mail,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { PlanCreditsPanel } from '@/components/billing/plan-credits-panel';

const supabase = createClient();

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: '12px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex',
          height: '40px',
          width: '40px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          backgroundColor: 'var(--brand-light)',
          color: 'var(--brand)',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          flexShrink: 0
        }}>
          <Icon style={{ height: '20px', width: '20px' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{title}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0', fontWeight: 500 }}>{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ── Input component ────────────────────────────────────────────────────────────
function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  suffix,
}: {
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={`settings-${label.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={`settings-${label.toLowerCase().replace(/\s+/g, '-')}`}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-2)',
            padding: '10px 12px',
            fontSize: '14px',
            color: 'var(--text-1)',
            outline: 'none',
            transition: 'var(--transition)',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>{suffix}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();

  // Profile state
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [country, setCountry]     = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [savingPw, setSavingPw]           = useState(false);

  // Danger zone
  const [deleting, setDeleting]           = useState(false);

  const [loaded, setLoaded] = useState(false);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) { router.push('/sign-in'); return; }
      setEmail(u.email ?? '');
      setFullName(u.user_metadata?.full_name ?? '');
      setCountry(u.user_metadata?.country ?? '');
      setLoaded(true);
    });
  }, [router]);

  // Show loading skeleton while session is being fetched
  if (!loaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', margin: '0 auto', animation: 'pulse 1.5s infinite' }}>
        <div style={{ height: '32px', width: '192px', borderRadius: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }} />
        <div style={{ height: '16px', width: '288px', borderRadius: '8px', backgroundColor: 'var(--surface-2)' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ height: '40px', width: '40px', borderRadius: '10px', backgroundColor: 'var(--surface-2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ height: '16px', width: '128px', borderRadius: '4px', backgroundColor: 'var(--surface-2)' }} />
                <div style={{ height: '12px', width: '192px', borderRadius: '4px', backgroundColor: 'var(--surface-2)' }} />
              </div>
            </div>
            <div style={{ height: '40px', width: '100%', borderRadius: '8px', backgroundColor: 'var(--surface-2)' }} />
            <div style={{ height: '40px', width: '100%', borderRadius: '8px', backgroundColor: 'var(--surface-2)' }} />
          </div>
        ))}
      </div>
    );
  }

  // ── Save profile ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, country },
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push('/sign-in');
    router.refresh();
  };

  // ── Delete account ───────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Deactivate your JobIN profile? You will lose access to JobIN with this account. This does not delete your authentication-provider account or erase your data.',
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Your session has expired. Sign in and try again.');

      await apiClient.delete<void>('/users/me', session.access_token);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      toast.success('Your JobIN profile has been deactivated.');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to deactivate profile');
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          Settings
        </h1>
        <p style={{ marginTop: '4px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '4px 0 0 0' }}>
          Manage your account, security, and preferences.
        </p>
      </div>

      {/* ── Profile ── */}
      <Section icon={User} title="Profile" description="Update your personal information.">
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Input
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            placeholder="Jane Doe"
          />
          <Input
            label="Country"
            value={country}
            onChange={setCountry}
            placeholder="United Kingdom"
          />
        </div>
        <Input
          label="Email Address"
          value={email}
          disabled
          suffix={<Mail style={{ height: '16px', width: '16px', color: 'var(--text-3)' }} />}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500, margin: 0 }}>
          Email is managed by your authentication provider and cannot be changed here.
        </p>
        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px',
            backgroundColor: 'var(--brand)',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition)',
            alignSelf: 'flex-start',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Save style={{ height: '16px', width: '16px' }} />
          {savingProfile ? 'Saving…' : 'Save Profile'}
        </button>
      </Section>

      {/* ── Password ── */}
      <Section
        icon={Lock}
        title="Change Password"
        description="Update your password. Minimum 8 characters."
      >
        <Input
          label="New Password"
          type={showPw ? 'text' : 'password'}
          value={newPassword}
          onChange={setNewPassword}
          placeholder="••••••••"
          suffix={
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              aria-pressed={showPw}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}
            >
              {showPw ? <EyeOff style={{ height: '16px', width: '16px' }} /> : <Eye style={{ height: '16px', width: '16px' }} />}
            </button>
          }
        />
        <Input
          label="Confirm New Password"
          type={showPw ? 'text' : 'password'}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
        />
        <button
          onClick={handleChangePassword}
          disabled={savingPw || !newPassword}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px',
            backgroundColor: 'var(--brand)',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition)',
            alignSelf: 'flex-start',
            boxShadow: 'var(--shadow-sm)',
            opacity: (savingPw || !newPassword) ? 0.5 : 1
          }}
        >
          <CheckCircle style={{ height: '16px', width: '16px' }} />
          {savingPw ? 'Updating…' : 'Update Password'}
        </button>
      </Section>

      {/* ── Notifications ── */}
      <Section
        icon={Bell}
        title="Notifications"
        description="Notification preferences are not available yet."
      >
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
          Notification settings cannot be changed until email preference controls are supported.
        </p>
      </Section>

      <PlanCreditsPanel />

      {/* ── Danger Zone ── */}
      <Section
        icon={Shield}
        title="Account Actions"
        description="Sign out or deactivate your JobIN profile."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              gap: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-2)',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-2)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text-2)';
            }}
          >
            <LogOut style={{ height: '16px', width: '16px' }} />
            Sign out of JobIN
          </button>

          <div style={{ borderRadius: '10px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
              <AlertTriangle style={{ height: '18px', width: '18px' }} />
              <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Danger Zone</p>
            </div>
            <p style={{ fontSize: '12px', color: '#B91C1C', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              Deactivate your JobIN profile. This blocks access to JobIN with this account, but does
              not delete your authentication-provider account or permanently erase associated data.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEE2E2',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#EF4444',
                cursor: 'pointer',
                transition: 'var(--transition)',
                alignSelf: 'flex-start'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FCA5A5'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
            >
              <Trash2 style={{ height: '16px', width: '16px' }} />
              {deleting ? 'Deactivating…' : 'Deactivate JobIN Profile'}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
