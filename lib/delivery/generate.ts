/**
 * Shared Generation Logic
 *
 * Core functions for batch order generation, used by both:
 * - The admin API route (POST /api/admin/delivery/generate)
 * - The cron endpoint (GET /api/cron/generate-orders)
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getEarliestEligibleCycle,
  generateOrdersForCycle,
} from '@/lib/data';
import type { BatchGenerationResult } from '@/lib/subscription';

/** Extended result that allows null cycleId/cycleDate when no eligible cycle found */
export interface GenerationResult {
  cycleId: string | null;
  cycleDate: string | null;
  generated: number;
  skipped: number;
  excluded: number;
  errors: number;
  errorDetails: Array<{ subscriptionId: string; error: string }>;
  message?: string;
}

/**
 * Find the earliest upcoming cycle eligible for generation and generate orders.
 * Used by both the cron job and admin manual trigger (auto-detect mode).
 */
export async function generateOrdersForActiveCycle(
  performedBy: string,
): Promise<GenerationResult> {
  // Auto-detect: find earliest upcoming cycle where delivery_date <= today
  const cycle = await getEarliestEligibleCycle();

  if (!cycle) {
    return {
      cycleId: null,
      cycleDate: null,
      generated: 0,
      skipped: 0,
      excluded: 0,
      errors: 0,
      errorDetails: [],
      message: 'Няма предстоящ цикъл за генериране.',
    };
  }

  // Generate orders for the cycle
  const result = await generateOrdersForCycle(cycle.id, performedBy);

  return {
    ...result,
    cycleId: cycle.id,
    cycleDate: cycle.delivery_date,
  };
}

/**
 * Generate orders for a specific cycle by ID.
 * Used by admin when explicitly selecting a cycle.
 */
export async function generateOrdersForSpecificCycle(
  cycleId: string,
  performedBy: string,
): Promise<GenerationResult> {
  // Validate cycle exists
  const { data: cycle } = await supabaseAdmin
    .from('delivery_cycles')
    .select('id, delivery_date')
    .eq('id', cycleId)
    .single();

  if (!cycle) {
    throw new Error('Цикълът не е намерен.');
  }

  const result = await generateOrdersForCycle(cycleId, performedBy);

  return {
    ...result,
    cycleId: cycle.id,
    cycleDate: cycle.delivery_date,
  };
}
