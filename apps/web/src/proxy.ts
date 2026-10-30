import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === '/' &&
    (request.nextUrl.searchParams.has('code') ||
      request.nextUrl.searchParams.has('error')) &&
    !request.nextUrl.searchParams.has('state')
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = '/auth/callback';
    return NextResponse.redirect(callbackUrl);
  }

  const pathname = request.nextUrl.pathname;
  const usesExternalAuth =
    process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0' ||
    process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci';

  let supabaseResponse = NextResponse.next({
    request,
  });
  const cookieMutations = new Map<string, { value: string; options?: CookieOptions }>();

  const refreshResponse = () => {
    supabaseResponse = NextResponse.next({ request });
    cookieMutations.forEach(({ value, options }, name) => {
      supabaseResponse.cookies.set(name, value, options);
    });
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value);
          cookieMutations.set(name, { value, options });
          refreshResponse();
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set(name, '');
          cookieMutations.set(name, { value: '', options: { ...options, maxAge: 0 } });
          refreshResponse();
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/auth/login') ||
    request.nextUrl.pathname.startsWith('/auth/signup') ||
    request.nextUrl.pathname.startsWith('/sign-in') ||
    request.nextUrl.pathname.startsWith('/sign-up') ||
    request.nextUrl.pathname.startsWith('/admin-login') ||
    request.nextUrl.pathname.startsWith('/auth/callback') ||
    request.nextUrl.pathname.startsWith('/api/');

  const requiresSupabaseAuth = usesExternalAuth
    ? pathname.startsWith('/admin/') || pathname === '/admin'
    : !isPublicRoute;

  if (!user && requiresSupabaseAuth) {
    const url = request.nextUrl.clone();
    if (request.nextUrl.pathname.startsWith('/admin')) {
      url.pathname = '/admin-login';
    } else {
      url.searchParams.set('next', request.nextUrl.pathname);
      url.pathname = '/sign-in';
    }
    const redirectResponse = NextResponse.redirect(url);
    cookieMutations.forEach(({ value, options }, name) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
