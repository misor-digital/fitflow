/**
 * Next.js Middleware
 * 
 * Handles:
 * - Customer account route protection
 * - Redirect logic
 * 
 * Note: All Supabase/auth logic moved to API routes for better separation of concerns
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();
  if (pathname.startsWith('/account/login')) return NextResponse.next();
  if (pathname.startsWith('/account/register')) return NextResponse.next();

  // Verify authentication via API call
  let isAuthenticated = false;
  
  try {
    // Call internal API to verify auth (uses server-side Supabase client)
    const verifyUrl = new URL('/api/auth/verify', request.url);
    const verifyResponse = await fetch(verifyUrl.toString(), {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (verifyResponse.ok) {
      const { authenticated } = await verifyResponse.json();
      isAuthenticated = authenticated;
    }
  } catch (error) {
    console.error('Middleware auth verification failed:', error);
    // On error, assume not authenticated for security
    isAuthenticated = false;
  }

  // Protected customer routes
  const protectedCustomerRoutes = [
    '/account',
    '/account/profile',
    '/account/preorders',
  ];

  // Public customer auth routes
  const publicCustomerAuthRoutes = [
    '/account/login',
    '/account/register',
    '/account/forgot-password',
    '/account/reset-password',
  ];

  // Check if current path is a protected customer route
  const isProtectedCustomerRoute = protectedCustomerRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is a public auth route
  const isPublicAuthRoute = publicCustomerAuthRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedCustomerRoute && !isAuthenticated) {
    const redirectUrl = new URL('/account/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from public auth routes to account dashboard
  if (isPublicAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    // '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/account/:path*'
  ],
};
