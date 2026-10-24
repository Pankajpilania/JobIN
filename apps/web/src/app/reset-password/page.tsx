'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (
      process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ||
      process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci'
    ) {
      setError('Password resets are managed by your identity provider. Use its sign-in page.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.replace('/sign-in?passwordReset=true');
    router.refresh();
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
          <h1 style={{ color: 'var(--text-1)', margin: 0 }}>Choose a new password</h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>
            Use at least 8 characters for your password.
          </p>
        </header>
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
            New password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          <label
            style={{
              display: 'grid',
              gap: 6,
              color: 'var(--text-2)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
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
