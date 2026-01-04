/**
 * Internal-only layout for marketing and ops tools
 * 
 * ============================================================================
 * PRODUCTION SAFETY - CRITICAL
 * ============================================================================
 * 
 * This layout wraps all internal-only routes under /internal.
 * It provides environment gating at the layout level, ensuring that:
 * 
 * 1. In production: Returns 404 (route not found)
 * 2. In non-production: Renders children with internal UI chrome
 * 
 * INTENDED ENVIRONMENTS:
 * - feat (feature branches)
 * - dev (development)
 * - stage (staging/pre-production)
 * 
 * BLOCKED ENVIRONMENTS:
 * - production
 * - prod
 * - (any unknown/missing value)
 * 
 * WHY THIS EXISTS:
 * Internal tools like the marketing campaign UI are for QA, ops, and
 * marketing teams only. This layout ensures the entire /internal
 * route tree is inaccessible in production.
 * 
 * ROLLBACK:
 * If this UI causes issues, the entire /internal directory can be
 * deleted without affecting any production functionality.
 * 
 * ============================================================================
 */

import { isInternalEnvironment, getEnvironmentLabel } from '@/lib/internal';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PRODUCTION SAFETY: Block access in production environments
  if (!isInternalEnvironment()) {
    notFound();
  }

  const envLabel = getEnvironmentLabel();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Internal Environment Banner */}
      <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Internal Only — {envLabel} Environment
          <span className="text-amber-800 text-xs">(Not visible in production)</span>
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

            {/* Back to Main Site */}
            <div className="flex items-center">
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Site
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-gray-500">
            Internal tools for QA, ops, and marketing. 
            <span className="text-amber-600 font-medium"> Not accessible in production.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
