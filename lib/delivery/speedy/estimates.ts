/**
 * Speedy Cost Estimates
 *
 * Dry-run price calculation (POST /calculate) for orders, used to compare
 * courier pickup vs office drop-off before creating waybills. Nothing is
 * created in Speedy.
 */

import 'server-only';

import type { CostEstimate, SenderMode } from '@/lib/constants/speedy';
import { calculateShipment, SpeedyApiError } from './client';
import { bgnToEur } from './config';
import { buildCalculationRequest, loadParcelConfig, type OrderForShipment } from './shipments';
import type { CalculateResponse } from './types';

type ParcelConfig = Awaited<ReturnType<typeof loadParcelConfig>>;
type Calculation = CalculateResponse['calculations'][number];

export interface OrderCostCalculation {
  calculation: Calculation;
  costEur: number;
}

function priceToEur(price: Calculation['price']): number {
  return price.currency === 'BGN'
    ? bgnToEur(price.total)
    : Math.round(price.total * 100) / 100;
}

/**
 * Calculate the Speedy price of an order for the given sender mode.
 * Throws SpeedyApiError when Speedy rejects the calculation.
 */
export async function calculateOrderCost(
  order: OrderForShipment,
  senderMode: SenderMode,
  parcel?: ParcelConfig,
): Promise<OrderCostCalculation> {
  const params = await buildCalculationRequest(order, parcel ?? (await loadParcelConfig()), { senderMode });
  const response = await calculateShipment(params);
  const calculation = response.calculations[0];

  if (!calculation) {
    throw new SpeedyApiError('Няма калкулация от Speedy.', 200, '');
  }
  if (calculation.error) {
    throw new SpeedyApiError(
      calculation.error.message,
      200,
      JSON.stringify(calculation.error),
      calculation.error.context,
      {
        code: calculation.error.code,
        errorId: calculation.error.id != null ? String(calculation.error.id) : undefined,
        component: calculation.error.component,
      },
    );
  }

  return { calculation, costEur: priceToEur(calculation.price) };
}

/** Estimate cost and margin for one order and mode; never throws. */
export async function estimateOrderCost(
  order: OrderForShipment,
  senderMode: SenderMode,
  parcel?: ParcelConfig,
): Promise<CostEstimate> {
  try {
    const { costEur } = await calculateOrderCost(order, senderMode, parcel);
    return {
      ok: true,
      costEur,
      marginEur: Math.round((order.deliveryFeeEur - costEur) * 100) / 100,
    };
  } catch (err) {
    if (!(err instanceof SpeedyApiError)) {
      console.error('[Speedy Estimate] Unexpected error', { orderId: order.id, senderMode, err });
    }
    return {
      ok: false,
      error: err instanceof SpeedyApiError ? `Speedy: ${err.message}` : 'Грешка при калкулация.',
    };
  }
}

/** Run async tasks with a fixed concurrency limit, preserving result order. */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
