/**
 * Cookie consent types for GDPR compliance
 */

/** Cookie categories as defined in the cookie policy */
export type CookieCategory = 'necessary' | 'analytics' | 'marketing';

/** User's consent preferences for each category */
export interface ConsentPreferences {
  necessary: true; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
}

/** Consent record with versioning for re-prompting on policy changes */
export interface ConsentRecord {
  /** User's consent preferences */
  preferences: ConsentPreferences;
  /** ISO timestamp when consent was given */
  timestamp: string;
  /** Version of the consent policy (increment when policy changes) */
  version: number;
}

/** Current consent policy version - increment when cookie policy changes */
export const CONSENT_VERSION = 1;

/** Default preferences (only necessary cookies) */
export const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/** LocalStorage key for consent data */
export const CONSENT_STORAGE_KEY = 'fitflow-cookie-consent';
