/**
 * Internal-only utilities module
 * 
 * This module exports utilities for internal-only features that must
 * NEVER be accessible in production environments.
 * 
 * See environment.ts for detailed documentation on production safety.
 */

export {
  // Environment detection
  getCurrentEnvironment,
  isInternalEnvironment,
  isProductionEnvironment,
  getEnvironmentLabel,
  assertInternalEnvironment,
  getEnvironmentInfo,
  // Types
  type AllowedEnvironment,
  type BlockedEnvironment,
  type EnvironmentInfo,
} from './environment';
