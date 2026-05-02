/**
 * Speedy Sender Configuration
 *
 * clientId is obtained from the Contract Clients endpoint (admin/speedy setup page).
 * serviceId is the courier service to use for domestic shipments.
 */

import 'server-only';

export const SPEEDY_SENDER_CLIENT_ID = Number(process.env.SPEEDY_CLIENT_ID) || 0;
export const SPEEDY_SERVICE_ID = Number(process.env.SPEEDY_SERVICE_ID) || 505;

export function getSpeedySenderConfig() {
  if (!SPEEDY_SENDER_CLIENT_ID) {
    throw new Error('SPEEDY_CLIENT_ID env var not set. Run admin/speedy setup page to discover it.');
  }
  return {
    clientId: SPEEDY_SENDER_CLIENT_ID,
    serviceId: SPEEDY_SERVICE_ID,
  };
}

// ============================================================================
// Currency Conversion (BGN ↔ EUR fixed rate)
// ============================================================================

/** Fixed peg: 1 EUR = 1.95583 BGN */
export const BGN_TO_EUR_RATE = 1.95583;

export function bgnToEur(bgn: number): number {
  return Math.round((bgn / BGN_TO_EUR_RATE) * 100) / 100;
}

export function eurToBgn(eur: number): number {
  return Math.round(eur * BGN_TO_EUR_RATE * 100) / 100;
}
