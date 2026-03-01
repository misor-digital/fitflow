import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js 16 proxy handler — runs on every request.
 *
 * Responsibilities:
 * 1. Redirect legacy routes.
 * 2. Refresh Supabase auth session cookies (best-effort).
 *
 * Does NOT perform authorization — that's the DAL's job.
 */

/** Timeout for the Supabase Auth call so the proxy never stalls a request. */
const AUTH_TIMEOUT_MS = 5_000;

export default async function proxy(request: NextRequest) {
  // Legacy route redirects
  const redirects: Record<string, string> = {
    '/step-1': '/order',
    '/step-2': '/order',
    '/step-3': '/order',
    '/step-4': '/order',
    '/thank-you/preorder': '/order/thank-you',
    '/admin/preorders': '/admin/orders',
    '/admin/preorders/legacy': '/admin/orders/legacy',
  };

  const pathname = request.nextUrl.pathname;
  if (redirects[pathname]) {
    return NextResponse.redirect(new URL(redirects[pathname], request.url), 301);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagate cookies to both the request (for server components)
          // and the response (for the browser)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session (best-effort).
  //
  // Fast path: getClaims() validates the JWT locally without a network call.
  // If the token is still valid (not expired) there's nothing to refresh —
  // we skip the expensive getUser() round-trip and save ~50-100 ms per request.
  //
  // Slow path: when the JWT IS expired, getClaims() still succeeds (it
  // doesn't check `exp`), so we call getUser() which triggers a refresh via
  // the refresh-token.  This is wrapped in a timeout + try/catch so that a
  // Supabase outage never stalls every request for the 10 s TCP connect
  // timeout.
  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) {
      const exp = (data.claims as { exp?: number }).exp;
      // Refresh proactively if the token expires within 60 s
      const needsRefresh = !exp || exp < Math.floor(Date.now() / 1000) + 60;
      if (needsRefresh) {
        await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('proxy auth timeout')), AUTH_TIMEOUT_MS),
          ),
        ]);
      }
    }
  } catch {
    // Non-fatal — if Supabase is unreachable the user will see the
    // unauthorized boundary on protected pages, but public pages and
    // cached data still render immediately.
  }

  return supabaseResponse;
}
