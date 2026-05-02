import 'server-only';
import { cancelShipment } from './client';

export interface CancellationResult {
  parcelId: string;
  success: boolean;
  error?: string;
}

/**
 * Cancel a Speedy waybill.
 * Only works if shipment hasn't been picked up yet.
 */
export async function cancelWaybill(
  parcelId: string,
  comment?: string,
): Promise<CancellationResult> {
  try {
    await cancelShipment({
      parcels: [{ id: parcelId }],
      comment: comment || 'Canceled by admin',
    });
    return { parcelId, success: true };
  } catch (error) {
    return {
      parcelId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
