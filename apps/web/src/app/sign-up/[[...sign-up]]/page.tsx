'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Registration successful! Please check your email to confirm your account.');
        setEmail('');
        setPassword('');
        setFullName('');
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
      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
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

      {/* ── Left panel (Desktop only) ────────────────────────────────────────── */}
      <div className="desktop-only" style={{
        position: 'relative',
        width: '45%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--surface-2)',
      }}>
        {/* Decoratives */}
        <div style={{
          position: 'absolute',
          top: '33.333%',
          left: '-64px',
          height: '320px',
          width: '320px',
          borderRadius: '50%',
          backgroundColor: 'rgba(79, 70, 229, 0.05)',
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

        {/* Copy */}
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <Badge variant="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}>
              <Sparkles className="h-3 w-3" /> Free forever — no credit card needed
            </Badge>
            <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: '1.2' }}>
              Your AI job search <span style={{ color: 'var(--brand)', fontWeight: 800 }}>starts here.</span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: '448px', lineHeight: '1.625' }}>
              Create your free account and get 50 AI credits instantly. Tailor your first resume, generate a cover letter, and start tracking applications today.
            </p>
          </div>

          {/* What you get list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>What you get for free</p>
            {[
              '50 AI credits to start',
              'Resume upload & ATS scoring',
              'Job application tracker',
              'AI cover letter generator',
              'Chrome extension access',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500 }}>
                <div style={{
                  display: 'flex',
                  height: '20px',
                  width: '20px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                  flexShrink: 0
                }}>
                  <div style={{ height: '6px', width: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>
                <span style={{ color: 'var(--text-2)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, zIndex: 2 }}>
          © 2026 JobIN. GDPR compliant. Your data is always yours.
        </p>
      </div>

      {/* ── Right Panel: Sign Up Form ────────────────────────────────────────── */}
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
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Create your account</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>Sign up to get started with JobIN.</p>
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

            {successMsg && (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10B981',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '6px',
                padding: '12px'
              }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }} htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
              Sign up with Google
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 500, userSelect: 'none' }}>
              <span style={{ color: 'var(--text-3)' }}>Already have an account? </span>
              <Link href="/sign-in" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Sign in
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
