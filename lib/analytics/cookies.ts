/**
 * Client-side cookie helpers for Meta CAPI integration.
 *
 * Reads _fbp (Facebook browser ID) and _fbc (Facebook click ID) cookies
 * set by the Meta Pixel, plus captures the current page URL for
 * event_source_url.
 */

/** Extract a cookie value by name from document.cookie. */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Return the Meta _fbp cookie if present. */
export function getFbp(): string | undefined {
  return getCookie('_fbp');
}

/** Return the Meta _fbc cookie if present. */
export function getFbc(): string | undefined {
  return getCookie('_fbc');
}

/** Return the current page URL (for CAPI event_source_url). */
export function getSourceUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

/**
 * Collect all Meta-related client context in one call.
 * Useful before POST-ing to /api/analytics/track.
 */
export function getMetaClientContext(): {
  fbp?: string;
  fbc?: string;
  sourceUrl: string;
} {
  return {
    fbp: getFbp(),
    fbc: getFbc(),
    sourceUrl: getSourceUrl(),
  };
}
