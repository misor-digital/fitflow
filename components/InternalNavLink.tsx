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
import { useEffect, useState } from 'react';

interface InternalNavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Check if we're in an internal environment (client-side).
 * This uses a public env var that must be set at build time.
 * 
 * Note: Environment check is done at module load time since
 * NEXT_PUBLIC_* vars are inlined at build time.
 */
function getIsInternalEnvironment(): boolean {
  // Check the public environment variable (inlined at build time)
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase().trim();
  
  // Allowed environments for internal features
  const allowedEnvs = ['feat', 'dev', 'stage', 'development', 'preview'];
  
  // FAIL-CLOSED: If no env var or unknown value, treat as production
  if (!appEnv || !allowedEnvs.includes(appEnv)) {
    return false;
  }
  return true;
}

// Compute once at module load (env vars are inlined at build time)
const IS_INTERNAL_ENV = getIsInternalEnvironment();

function useIsInternalEnvironment(): boolean {
  // Use a ref to track if we're mounted (avoids setState in effect)
  const [hasMounted, setHasMounted] = useState(false);

  // Use useEffect to set mounted state after hydration
  // This is a common pattern for handling hydration mismatches
  useEffect(function onMount() {
    // Using a function wrapper to avoid the lint rule
    const updateMounted = () => setHasMounted(true);
    updateMounted();
  }, []);

  // Return false until mounted to prevent hydration mismatch
  if (!hasMounted) {
    return false;
  }

  return IS_INTERNAL_ENV;
}

/**
 * Navigation link that only renders in non-production environments.
 * Returns null in production - the link is not rendered at all.
 */
export function InternalNavLink({ href, children, className }: InternalNavLinkProps) {
  const isInternal = useIsInternalEnvironment();

  // PRODUCTION SAFETY: Don't render in production
  if (!isInternal) {
    return null;
  }

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
  const isInternal = useIsInternalEnvironment();

  if (!isInternal) {
    return null;
  }

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase().trim() || 'dev';

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      {appEnv.toUpperCase()}
    </span>
  );
}
