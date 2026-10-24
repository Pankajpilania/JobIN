'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function ForgotPasswordPage() {
  const { startAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (
      process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ||
      process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci'
    ) {
      try {
        await startAuth('login', { email: email.trim() });
      } catch (authError) {
        setError(
          authError instanceof Error ? authError.message : 'Could not open the sign-in page.',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`;
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'var(--surface)',
      }}
    >
      <Card hoverEffect={false} style={{ width: '100%', maxWidth: 440, display: 'grid', gap: 18 }}>
        <header>
          <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Reset your password</h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>
            {process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ||
            process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci'
              ? `Continue to the secure ${
                  process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci' ? 'OCI' : 'Auth0'
                } sign-in page, then choose “Forgot password?” to receive a reset link.`
              : 'Enter your account email and we’ll send a password reset link if an account is eligible.'}
          </p>
        </header>

        {sent ? (
          <p role="status" style={{ color: 'var(--text-2)', margin: 0 }}>
            If an account matches that email, a reset link will arrive shortly. Check your inbox and
            spam folder.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <label
              style={{
                display: 'grid',
                gap: 6,
                color: 'var(--text-2)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 11,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                }}
              />
            </label>
            {error && (
              <p role="alert" style={{ color: 'var(--danger, #dc2626)', margin: 0 }}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Opening…'
                : process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ||
                    process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci'
                  ? `Continue to ${process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci' ? 'OCI' : 'Auth0'}`
                  : 'Send reset link'}
            </Button>
          </form>
        )}

        <Link
          href="/sign-in"
          style={{ color: 'var(--brand)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
        >
          Back to sign in
        </Link>
      </Card>
    </main>
  );
}
