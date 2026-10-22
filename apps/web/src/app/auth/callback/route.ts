import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  let next = '/dashboard';
  try {
    const candidate = new URL(requestedNext, origin);
    if (candidate.origin === origin) {
      next = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }
  } catch {
    // Use the dashboard as the safe default for malformed redirect targets.
  }
  const providerError = searchParams.get('error');

  if (providerError) {
    console.error('Supabase OAuth callback returned an error', {
      error: providerError,
    });
    return NextResponse.redirect(`${origin}/sign-in?error=auth-code-exchange-failed`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const pkceVerifierCookieNames = (request.headers.get('cookie') ?? '')
      .split(';')
      .map((cookie) => cookie.trim().split('=')[0])
      .filter((name) => name.endsWith('-auth-token-code-verifier'));

    console.error('Supabase OAuth code exchange failed', {
      code: error.code,
      message: error.message,
      status: error.status,
      pkceVerifierCookieNames,
    });
  } else {
    console.error('Supabase OAuth callback did not include an authorization code');
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth-code-exchange-failed`);
}
