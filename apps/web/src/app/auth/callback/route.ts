import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
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
    // Attach Supabase's PKCE/session cookie mutations directly to the redirect
    // response. This makes the new session available on the very next request
    // (including middleware's dashboard auth check).
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      response.headers.set('Cache-Control', 'no-store');
      return response;
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
