/**
 * Mid-Cycle Subscription Assignment
 *
 * Determines which delivery cycle a new subscription should be assigned to,
 * handling the edge case where a user subscribes after order generation has
 * already run for the current cycle.
 */

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUpcomingCycle } from '@/lib/data';
import type { DeliveryCycleRow, DeliveryCycleStatus } from '@/lib/supabase/types';

/**
 * Determine which cycle a new subscription should be assigned to.
 *
 * Logic:
 * 1. If there's an `upcoming` cycle that hasn't had orders generated yet → assign to that
 * 2. If the current cycle is `delivered` (orders generated but still recent) → still assign
 *    and create a late-addition order immediately
 * 3. If no cycles available → assign to the NEXT upcoming cycle when created
 */
export async function determineFirstCycle(): Promise<{
  cycleId: string;
  needsImmediateOrder: boolean;
}> {
  // Check for upcoming cycle (not yet generated)
  const upcoming = await getUpcomingCycle();
  if (upcoming) {
    return { cycleId: upcoming.id, needsImmediateOrder: false };
  }

  // Check for delivered cycle (orders generated but still active — not archived)
  const delivered = await getActiveCycleWithStatus('delivered');
  if (delivered) {
    return { cycleId: delivered.id, needsImmediateOrder: true };
  }

  // Fallback: no available cycle
  // This is handled by the subscription creation — first_cycle_id will reference
  // the next cycle that gets created by admin
  throw new Error('Няма наличен цикъл за доставка. Моля, опитайте по-късно.');
}

/**
 * Get the most recent cycle with a specific status.
 * Used internally to find delivered cycles for mid-cycle assignment.
 */
async function getActiveCycleWithStatus(
  status: DeliveryCycleStatus,
): Promise<DeliveryCycleRow | null> {
  const { data, error } = await supabaseAdmin
    .from('delivery_cycles')
    .select('*')
    .eq('status', status)
    .order('delivery_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching cycle with status ${status}:`, error);
    return null;
  }

  return data;
}
