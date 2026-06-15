'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const highlights = [
  'AI resume tailoring in under 10 seconds',
  'Beat the ATS with keyword optimization',
  'Track every application in one pipeline',
  'Chrome autofill on Greenhouse & Lever',
];

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    searchParams.get('error') === 'auth-code-exchange-failed' ? 'Google authentication failed' : ''
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');

    try {
      const next = searchParams.get('next') || '/dashboard';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--surface)', color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1023px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 1024px) {
          .desktop-only { display: flex !important; }
          .mobile-only { display: none !important; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />

      {/* ── Left branding panel (Desktop only) ────────────────────────────────── */}
      <div className="desktop-only" style={{
        position: 'relative',
        width: '45%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--surface-2)',
      }}>
        {/* Decorative elements without gradients */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '-96px',
          height: '384px',
          width: '384px',
          borderRadius: '50%',
          backgroundColor: 'rgba(79, 70, 229, 0.05)',
          filter: 'blur(64px)',
          zIndex: 1,
        }} />
        <div style={{
          position: 'absolute',
          bottom: '25%',
          right: '0',
          height: '256px',
          width: '256px',
          borderRadius: '50%',
          backgroundColor: 'rgba(79, 70, 229, 0.04)',
          filter: 'blur(64px)',
          zIndex: 1,
        }} />

        {/* Logo: 32px square brand bg + wordmark weight 800 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none', zIndex: 2 }}>
          <div style={{
            display: 'flex',
            height: '32px',
            width: '32px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: 'var(--brand)',
            color: 'white',
            fontWeight: 900,
            fontSize: '18px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            J
          </div>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text-1)' }}>
            JobIN
          </span>
        </div>

        {/* Brand details */}
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: '1.2' }}>
              Apply Smarter. <span style={{ color: 'var(--brand)', fontWeight: 800 }}>Get Hired Faster.</span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: '448px', lineHeight: '1.625' }}>
              The AI job-search assistant trusted by thousands of candidates to land more interviews.
            </p>
          </div>

          {/* Highlights */}
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px', listStyle: 'none', padding: 0 }}>
            {highlights.map((h) => (
              <li key={h} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-2)', fontWeight: 500 }}>
                <CheckCircle className="h-4 w-4" style={{ flexShrink: 0, color: '#10B981' }} />
                {h}
              </li>
            ))}
          </ul>

          {/* Stats Bar metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '8px' }}>
            {[
              { v: '94%', l: 'ATS pass rate' },
              { v: '3×',  l: 'More interviews' },
              { v: '10s', l: 'Resume tailor' },
            ].map(({ v, l }) => (
              <div key={l} style={{
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                padding: '16px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--brand)', lineHeight: '1', margin: 0 }}>{v}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px', margin: '8px 0 0 0' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, zIndex: 2 }}>
          © 2026 JobIN. Apply Smarter, Get Hired Faster.
        </p>
      </div>

      {/* ── Right Panel: Sign In Form ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '32px', backgroundColor: 'var(--surface)' }}>
        <div style={{ width: '100%', maxWidth: '448px' }}>
          {/* Mobile logo */}
          <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', userSelect: 'none' }}>
            <div style={{
              display: 'flex',
              height: '32px',
              width: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: 'var(--brand)',
              color: 'white',
              fontWeight: 900,
              fontSize: '18px'
            }}>
              J
            </div>
            <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text-1)' }}>JobIN</span>
          </div>

          <Card style={{
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }} hoverEffect={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Sign in to JobIN</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>Welcome back! Please enter your details.</p>
            </div>

            {errorMsg && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '6px',
                padding: '12px'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }} htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-1)',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'var(--transition)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }} htmlFor="password">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-1)',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      transition: 'var(--transition)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-3)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || googleLoading}
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </form>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '8px 0', userSelect: 'none' }}>
              <div style={{ flexGrow: 1, borderTop: '1px solid var(--border)' }}></div>
              <span style={{ padding: '0 16px', color: 'var(--text-3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
              <div style={{ flexGrow: 1, borderTop: '1px solid var(--border)' }}></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-2)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text-1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface)';
                e.currentTarget.style.color = 'var(--text-2)';
              }}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg style={{ height: '16px', width: '16px', marginRight: '6px' }} viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Sign in with Google
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 500, userSelect: 'none' }}>
              <span style={{ color: 'var(--text-3)' }}>Don't have an account? </span>
              <Link href="/sign-up" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Sign up
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
