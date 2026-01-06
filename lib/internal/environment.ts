/**
 * Environment gating helper for internal-only features
 * 
 * ============================================================================
 * PRODUCTION SAFETY - CRITICAL
 * ============================================================================
 * 
 * This module provides environment detection and gating for internal-only
 * features that must NEVER be accessible in production.
 * 
 * ALLOWED ENVIRONMENTS:
 * - feat (feature branches)
 * - dev (development)
 * - stage (staging/pre-production)
 * 
 * BLOCKED ENVIRONMENTS:
 * - production
 * - prod
 * - (any unknown/missing value - fail closed)
 * 
 * WHY THIS EXISTS:
 * Internal tools like the marketing campaign UI are intended for QA, ops,
 * and marketing teams only. Exposing these in production would:
 * - Create security risks (unauthorized access to campaign data)
 * - Allow accidental triggering of email campaigns
 * - Expose internal operational data to end users
 * 
 * FAIL-CLOSED BEHAVIOR:
 * If the environment variable is missing or has an unexpected value,
 * we treat it as production (blocked). This ensures that:
 * - Misconfiguration defaults to the safest state
 * - New environments must be explicitly allowed
 * - Production deployments without proper env vars are protected
 * 
 * USAGE:
 * - Routes: Check isInternalEnvironment() and return 404/redirect if false
 * - Components: Return null if !isInternalEnvironment()
 * - API routes: Return 404 if !isInternalEnvironment()
 * - Navigation: Only render internal links if isInternalEnvironment()
 * 
 * ============================================================================
 */

/**
 * Allowed environments for internal features.
 * Production and any unknown values are NOT in this list.
 */
const ALLOWED_INTERNAL_ENVIRONMENTS = ['feat', 'dev', 'stage', 'development', 'preview'] as const;

/**
 * Explicitly blocked environments (for documentation and clarity).
 * Any value not in ALLOWED_INTERNAL_ENVIRONMENTS is also blocked.
 */
const BLOCKED_ENVIRONMENTS = ['production', 'prod'] as const;

export type AllowedEnvironment = typeof ALLOWED_INTERNAL_ENVIRONMENTS[number];
export type BlockedEnvironment = typeof BLOCKED_ENVIRONMENTS[number];

/**
 * Get the current environment from environment variables.
 * 
 * Checks in order:
 * 1. NEXT_PUBLIC_APP_ENV - Custom app environment (recommended)
 * 2. VERCEL_ENV - Vercel deployment environment
 * 3. NODE_ENV - Node.js environment (fallback)
 * 
 * @returns The current environment string, or undefined if not set
 */
export function getCurrentEnvironment(): string | undefined {
  // Check custom app environment first (most explicit)
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  if (appEnv) {
    return appEnv.toLowerCase().trim();
  }

  // Check Vercel environment (set automatically on Vercel deployments)
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) {
    return vercelEnv.toLowerCase().trim();
  }

  // Fallback to NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv) {
    return nodeEnv.toLowerCase().trim();
  }

  return undefined;
}

/**
 * Check if the current environment allows internal features.
 * 
 * FAIL-CLOSED: Returns false if:
 * - Environment is explicitly blocked (production, prod)
 * - Environment is not in the allowed list
 * - Environment variable is missing or empty
 * 
 * This is the primary gating function used throughout the internal UI.
 * 
 * @returns true if internal features should be accessible, false otherwise
 */
export function isInternalEnvironment(): boolean {
  const env = getCurrentEnvironment();

  // FAIL-CLOSED: Missing environment = treat as production
  if (!env) {
    console.warn(
      '[Internal Environment] No environment variable set. ' +
      'Treating as production (internal features disabled). ' +
      'Set NEXT_PUBLIC_APP_ENV to enable internal features.'
    );
    return false;
  }

  // Check if explicitly blocked
  if ((BLOCKED_ENVIRONMENTS as readonly string[]).includes(env)) {
    return false;
  }

  // Check if explicitly allowed
  if ((ALLOWED_INTERNAL_ENVIRONMENTS as readonly string[]).includes(env)) {
    return true;
  }

  // FAIL-CLOSED: Unknown environment = treat as production
  console.warn(
    `[Internal Environment] Unknown environment "${env}". ` +
    'Treating as production (internal features disabled). ' +
    `Allowed environments: ${ALLOWED_INTERNAL_ENVIRONMENTS.join(', ')}`
  );
  return false;
}

/**
 * Check if the current environment is production.
 * 
 * @returns true if running in production, false otherwise
 */
export function isProductionEnvironment(): boolean {
  const env = getCurrentEnvironment();
  
  // Explicitly production
  if (env && (BLOCKED_ENVIRONMENTS as readonly string[]).includes(env)) {
    return true;
  }

  // FAIL-CLOSED: Missing or unknown = treat as production
  if (!env || !(ALLOWED_INTERNAL_ENVIRONMENTS as readonly string[]).includes(env)) {
    return true;
  }

  return false;
}

/**
 * Get a human-readable label for the current environment.
 * Used for displaying environment context in the UI.
 * 
 * @returns Environment label string
 */
export function getEnvironmentLabel(): string {
  const env = getCurrentEnvironment();

  switch (env) {
    case 'feat':
      return 'Feature';
    case 'dev':
    case 'development':
      return 'Development';
    case 'stage':
      return 'Staging';
    case 'preview':
      return 'Preview';
    case 'production':
    case 'prod':
      return 'Production';
    default:
      return 'Unknown';
  }
}

/**
 * Assert that internal features are allowed.
 * Throws an error if called in production.
 * 
 * Use this in server-side code where you want to fail loudly
 * rather than silently returning null/404.
 * 
 * @throws Error if internal features are not allowed
 */
export function assertInternalEnvironment(): void {
  if (!isInternalEnvironment()) {
    throw new Error(
      'Internal features are not available in this environment. ' +
      'This code path should not be reachable in production.'
    );
  }
}

/**
 * Environment information for debugging and logging.
 * Does NOT expose sensitive information.
 */
export interface EnvironmentInfo {
  current: string | undefined;
  isInternal: boolean;
  isProduction: boolean;
  label: string;
}

/**
 * Get environment information for debugging.
 * Safe to log (no sensitive data).
 * 
 * @returns Environment information object
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  return {
    current: getCurrentEnvironment(),
    isInternal: isInternalEnvironment(),
    isProduction: isProductionEnvironment(),
    label: getEnvironmentLabel(),
  };
}
