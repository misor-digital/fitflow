/**
 * Speedy Sender Configuration
 *
 * clientId is obtained from the Contract Clients endpoint (admin/speedy setup page).
 * serviceId is the courier service to use for domestic shipments.
 * dropoffOfficeId is read from site_config DB, env var, or defaults to 189.
 */

import 'server-only';

import { getDeliveryConfigMap } from '@/lib/data';

export const SPEEDY_SENDER_CLIENT_ID = Number(process.env.SPEEDY_CLIENT_ID) || 0;
export const SPEEDY_SERVICE_ID = Number(process.env.SPEEDY_SERVICE_ID) || 505;
// TODO: Make this a dropdown in the admin Speedy setup page
export const SPEEDY_DROPOFF_OFFICE_ID_DEFAULT = Number(process.env.SPEEDY_DROPOFF_OFFICE_ID) || 189;

export async function getSpeedySenderConfig() {
  if (!SPEEDY_SENDER_CLIENT_ID) {
    throw new Error('SPEEDY_CLIENT_ID env var not set. Run admin/speedy setup page to discover it.');
  }

  let dropoffOfficeId = SPEEDY_DROPOFF_OFFICE_ID_DEFAULT;
  try {
    const configMap = await getDeliveryConfigMap();
    const dbValue = Number(configMap.SPEEDY_DROPOFF_OFFICE_ID);
    if (dbValue) dropoffOfficeId = dbValue;
  } catch {
    // Fall through to env/default
  }

  return {
    clientId: SPEEDY_SENDER_CLIENT_ID,
    serviceId: SPEEDY_SERVICE_ID,
    dropoffOfficeId,
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
