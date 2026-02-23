import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js 16 proxy handler — runs on every request.
 * 
 * ONLY responsibility: refresh the Supabase auth session cookie.
 * Does NOT perform authorization — that's the DAL's job.
 */
export default async function proxy(request: NextRequest) {
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

  // Refresh the session — this reads and potentially updates the auth cookie.
  // getClaims() validates the JWT signature without a network call.
  // IMPORTANT: Do not use getUser() here — adds latency to every request.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
