/**
 * Internal-only layout for marketing and ops tools
 * 
 * ============================================================================
 * AUTHENTICATION & AUTHORIZATION
 * ============================================================================
 * 
 * This layout wraps all internal-only routes under /internal.
 * It provides authentication-based access control:
 * 
 * 1. Unauthenticated users: Redirected to /login
 * 2. Non-admin users: Shown 403 Forbidden page
 * 3. Admin users: Full access to internal tools
 * 
 * AUTHORIZED USERS:
 * - user_type = 'admin' with any admin role (admin, ops, marketing)
 * 
 * WHY THIS EXISTS:
 * Internal tools like the marketing campaign UI are for QA, ops, and
 * marketing teams only. This layout ensures the entire /internal
 * route tree requires admin authentication.
 * 
 * ============================================================================
 */

import { requireAdmin } from '@/lib/supabase/server-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogoutButton } from './LogoutButton';

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AUTHENTICATION: Require admin user
  const profile = await requireAdmin();
  
  if (!profile) {
    // Not authenticated or not admin - redirect to login
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Admin Tools — Logged in as {profile.email}
          <span className="text-blue-200 text-xs">({profile.role})</span>
        </span>
      </div>

      {/* Internal Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-8">
              {/* Logo / Home Link */}
              <Link 
                href="/internal" 
                className="flex items-center gap-2 text-gray-900 font-semibold"
              >
                <span className="text-lg">⚙️</span>
                <span>Internal Tools</span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden sm:flex items-center gap-6">
                <Link 
                  href="/internal/marketing/campaigns"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Campaigns
                </Link>
                <Link 
                  href="/internal/marketing/recipients"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Recipients
                </Link>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Site
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-gray-500">
            Internal tools for QA, ops, and marketing. 
            <span className="text-blue-600 font-medium"> Admin access required.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
