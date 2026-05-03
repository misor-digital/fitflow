/**
 * Speedy Shipment Tracking
 *
 * Track parcel statuses via the Speedy Track endpoint.
 * Provides status labels, final-status detection, and bulk tracking.
 */

import 'server-only';

import { trackParcels } from './client';

// ============================================================================
// Constants
// ============================================================================

/** Status codes where no more tracking updates will come. */
export const FINAL_STATUS_CODES = new Set([-14, 124, 125, 127, 128, 129]);

/** Human-readable status labels in Bulgarian. */
export const STATUS_LABELS: Record<number, string> = {
  1: 'Приета',
  2: 'В обработка',
  5: 'На път',
  7: 'В офис за получаване',
  [-14]: 'Доставена',
  124: 'Върната на подател',
  125: 'Унищожена',
  127: 'Кражба',
  128: 'Анулирана',
  129: 'Административно закрита',
};

/** Map status codes to simplified string statuses for DB storage. */
export const STATUS_CODE_TO_STRING: Record<number, string> = {
  1: 'accepted',
  2: 'processing',
  5: 'in_transit',
  7: 'at_office',
  [-14]: 'delivered',
  124: 'returned',
  125: 'destroyed',
  127: 'theft',
  128: 'canceled',
  129: 'closed',
};

/** Status colors for UI badges. */
export const STATUS_COLORS: Record<string, string> = {
  created: 'bg-blue-100 text-blue-700',
  accepted: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-orange-100 text-orange-700',
  at_office: 'bg-green-100 text-green-700',
  delivered: 'bg-green-100 text-green-700',
  returned: 'bg-red-100 text-red-700',
  destroyed: 'bg-red-100 text-red-700',
  theft: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-600',
};

// ============================================================================
// Types
// ============================================================================

export interface TrackingResult {
  parcelId: string;
  lastStatusCode: number;
  lastStatusLabel: string;
  lastStatusString: string;
  lastStatusDate: string;
  isFinal: boolean;
}

// ============================================================================
// Public API
// ============================================================================

/** Check if a status code is final (no more updates expected). */
export function isFinalStatus(code: number): boolean {
  return FINAL_STATUS_CODES.has(code);
}

/** Get a human-readable label for a status code. */
export function getStatusLabel(code: number): string {
  return STATUS_LABELS[code] ?? `Код ${code}`;
}

/** Get the DB string representation for a status code. */
export function getStatusString(code: number): string {
  return STATUS_CODE_TO_STRING[code] ?? 'unknown';
}

/**
 * Track multiple parcels — last operation only (for bulk sync).
 * Batches requests in groups of 10.
 */
export async function trackParcelsBulk(parcelIds: string[]): Promise<TrackingResult[]> {
  if (parcelIds.length === 0) return [];

  const BATCH_SIZE = 10;
  const results: TrackingResult[] = [];

  for (let i = 0; i < parcelIds.length; i += BATCH_SIZE) {
    const batch = parcelIds.slice(i, i + BATCH_SIZE);
    const response = await trackParcels({
      parcels: batch.map((id) => ({ id })),
      lastOperationOnly: true,
    });

    for (const parcel of response.parcels) {
      const lastOp = parcel.operations[0];
      if (!lastOp) continue;

      results.push({
        parcelId: parcel.id,
        lastStatusCode: lastOp.operationCode,
        lastStatusLabel: getStatusLabel(lastOp.operationCode),
        lastStatusString: getStatusString(lastOp.operationCode),
        lastStatusDate: lastOp.dateTime,
        isFinal: isFinalStatus(lastOp.operationCode),
      });
    }
  }

  return results;
}

/**
 * Track a single parcel — full history.
 */
export async function trackParcelFull(parcelId: string) {
  const response = await trackParcels({
    parcels: [{ id: parcelId }],
    lastOperationOnly: false,
  });

  const parcel = response.parcels[0];
  if (!parcel) return null;

  return {
    parcelId: parcel.id,
    events: parcel.operations.map((op) => ({
      dateTime: op.dateTime,
      operationCode: op.operationCode,
      description: op.description,
      place: op.place,
      comment: op.comment,
      label: getStatusLabel(op.operationCode),
    })),
  };
}
