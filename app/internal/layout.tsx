/**
 * Internal-only layout for marketing and ops tools
 * 
 * ============================================================================
 * AUTHENTICATION REQUIRED
 * ============================================================================
 * 
 * This layout wraps all internal-only routes under /internal.
 * Access is controlled by authentication and admin role authorization.
 * 
 * The middleware handles:
 * - Authentication check (redirects to /login if not authenticated)
 * - Admin role verification (returns 403 if not admin)
 * 
 * This layout provides the UI chrome for authenticated admin users.
 * 
 * ============================================================================
 */

import { getSession } from '@/lib/auth/server';
import Link from 'next/link';

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current session (middleware already verified admin role)
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Admin Tools — Logged in as {session.user?.email}
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

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Link 
                href="/account/change-password"
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Change Password
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </form>
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Main Site
              </Link>
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
            Internal tools for admin users. 
            <span className="text-blue-600 font-medium"> Secure access via authentication.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
