/**
 * Next.js Middleware for Route Protection
 * 
 * This middleware protects internal routes and API endpoints with authentication
 * and role-based authorization. It runs before every request.
 * 
 * Protected routes:
 * - /internal/* - Requires admin role
 * - /api/marketing/* - Requires admin role
 * - /account/* - Requires authentication
 * 
 * Public routes:
 * - /login
 * - /api/auth/*
 * - All other routes
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserRoleRow } from './lib/supabase/types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response object that we can modify
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with middleware cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if route requires authentication
  const requiresAuth = pathname.startsWith('/internal') || 
                       pathname.startsWith('/api/marketing') ||
                       pathname.startsWith('/account');

  // Check if route requires admin role
  const requiresAdmin = pathname.startsWith('/internal') || 
                        pathname.startsWith('/api/marketing');

  // If route requires auth and user is not authenticated
  if (requiresAuth && !user) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If route requires admin role, check user roles
  if (requiresAdmin && user) {
    // Fetch user roles from database using session client
    // RLS policy allows authenticated users to read their own roles
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user roles:', error);
      
      // For API routes, return 500
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Failed to verify permissions' },
          { status: 500 }
        );
      }

      // For pages, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const userRoles = roles?.map(r => r.role) ?? [];
    const isAdmin = userRoles.includes('admin');

    // If user is not admin, deny access
    if (!isAdmin) {
      // For API routes, return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Admin role required' },
          { status: 403 }
        );
      }

      // For pages, show 403 error
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }
  }

  // If user is authenticated and trying to access login page, redirect to internal
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/internal', request.url));
  }

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
