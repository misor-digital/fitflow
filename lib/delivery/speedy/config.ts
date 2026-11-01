/**
 * Speedy Sender Configuration
 *
 * clientId is obtained from the Contract Clients endpoint (admin/speedy setup page).
 * serviceId is the courier service to use for domestic shipments.
 * senderMode decides how parcels reach Speedy: 'pickup' (courier collects from the
 * contract client's registered address) or 'dropoff' (we drop them at an office).
 * Read from site_config DB, then env var, then defaults to 'pickup'.
 * dropoffOfficeId (dropoff mode only) is read from site_config DB, env var, or defaults to 189.
 * Pickup defaults (contact, phone, visit end time, visit fee) come from site_config.
 */

import 'server-only';

import { getDeliveryConfigMap } from '@/lib/data';
import type { SpeedySenderMode } from '@/lib/supabase/types';

export const SPEEDY_SENDER_CLIENT_ID = Number(process.env.SPEEDY_CLIENT_ID) || 0;
export const SPEEDY_SERVICE_ID = Number(process.env.SPEEDY_SERVICE_ID) || 505;
// TODO: Make this a dropdown in the admin Speedy setup page
export const SPEEDY_DROPOFF_OFFICE_ID_DEFAULT = Number(process.env.SPEEDY_DROPOFF_OFFICE_ID) || 189;
export const SPEEDY_PICKUP_VISIT_END_TIME_DEFAULT = '17:00';

function parseSenderMode(value: string | null | undefined): SpeedySenderMode | null {
  return value === 'pickup' || value === 'dropoff' ? value : null;
}

async function readConfigMap(): Promise<Record<string, string | null>> {
  try {
    return await getDeliveryConfigMap();
  } catch {
    return {};
  }
}

function resolveSenderMode(configMap: Record<string, string | null>): SpeedySenderMode {
  return (
    parseSenderMode(configMap.SPEEDY_SENDER_MODE) ??
    parseSenderMode(process.env.SPEEDY_SENDER_MODE) ??
    'pickup'
  );
}

/** Configured sender mode (DB → env → 'pickup'); does not require SPEEDY_CLIENT_ID. */
export async function getConfiguredSenderMode(): Promise<SpeedySenderMode> {
  return resolveSenderMode(await readConfigMap());
}

export async function getSpeedySenderConfig(): Promise<{
  clientId: number;
  serviceId: number;
  dropoffOfficeId: number;
  senderMode: SpeedySenderMode;
}> {
  if (!SPEEDY_SENDER_CLIENT_ID) {
    throw new Error('SPEEDY_CLIENT_ID env var not set. Run admin/speedy setup page to discover it.');
  }

  const configMap = await readConfigMap();

  let dropoffOfficeId = SPEEDY_DROPOFF_OFFICE_ID_DEFAULT;
  const dbOfficeId = Number(configMap.SPEEDY_DROPOFF_OFFICE_ID);
  if (dbOfficeId) dropoffOfficeId = dbOfficeId;

  const senderMode = resolveSenderMode(configMap);

  return {
    clientId: SPEEDY_SENDER_CLIENT_ID,
    serviceId: SPEEDY_SERVICE_ID,
    dropoffOfficeId,
    senderMode,
  };
}

export interface SpeedyPickupDefaults {
  contactName: string;
  phone: string;
  visitEndTime: string;
  /** Informational only — not included in the delivery margin */
  visitFeeEur: number | null;
}

export async function getSpeedyPickupDefaults(): Promise<SpeedyPickupDefaults> {
  const configMap = await readConfigMap();

  const visitEndTime = configMap.SPEEDY_PICKUP_VISIT_END_TIME;
  const feeRaw = configMap.SPEEDY_PICKUP_VISIT_FEE_EUR;
  const fee = feeRaw ? Number(feeRaw) : NaN;

  return {
    contactName: configMap.SPEEDY_PICKUP_CONTACT_NAME ?? '',
    phone: configMap.SPEEDY_PICKUP_PHONE ?? '',
    visitEndTime:
      visitEndTime && /^([01]?\d|2[0-3]):[0-5]\d$/.test(visitEndTime)
        ? visitEndTime
        : SPEEDY_PICKUP_VISIT_END_TIME_DEFAULT,
    visitFeeEur: Number.isFinite(fee) && fee >= 0 ? fee : null,
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
