'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Always redirect to /admin after successful login
      router.push('/admin');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--surface-2)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(79, 70, 229, 0.08)',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            height: '52px',
            width: '52px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
            backgroundColor: 'var(--brand)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
          }}>
            <ShieldCheck style={{ height: '28px', width: '28px', color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>
              Admin Portal
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0', fontWeight: 500 }}>
              JobIN — Restricted Access
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#DC2626',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            padding: '12px 14px',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Admin Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-1)',
                fontSize: '14px',
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                  display: 'flex', alignItems: 'center', padding: 0,
                }}
              >
                {showPassword ? <EyeOff style={{ height: '16px', width: '16px' }} /> : <Eye style={{ height: '16px', width: '16px' }} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '8px',
              backgroundColor: loading ? 'var(--brand-mid)' : 'var(--brand)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.15s',
              marginTop: '4px',
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />
                Signing in…
              </>
            ) : (
              <>
                <ShieldCheck style={{ height: '16px', width: '16px' }} />
                Sign In to Admin Panel
              </>
            )}
          </button>
        </form>

        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)', margin: 0, fontWeight: 500 }}>
          This area is restricted to authorised administrators only.
        </p>
      </div>
    </div>
  );
}
