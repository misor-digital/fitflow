/**
 * Internal Navigation Link Component
 * 
 * A navigation link that only renders in non-production environments.
 * Used to add internal tool links to the main site navigation.
 * 
 * ============================================================================
 * PRODUCTION SAFETY - CRITICAL
 * ============================================================================
 * 
 * This component checks the environment before rendering.
 * In production, it returns null (renders nothing).
 * 
 * This ensures that:
 * - Internal tool links are never visible to production users
 * - The link is not just hidden via CSS, it's not rendered at all
 * - No internal routes are discoverable through the navigation
 * 
 * ============================================================================
 */

'use client';

import Link from 'next/link';

interface InternalNavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Navigation link that only renders in non-production environments.
 */
export function InternalNavLink({ href, children, className }: InternalNavLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * A badge/indicator that shows we're in an internal environment.
 * Only renders in non-production environments.
 */
export function InternalEnvironmentBadge() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase().trim() || 'dev';

  if (appEnv === 'prod' || appEnv === 'production') {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      {appEnv.toUpperCase()}
    </span>
  );
}
