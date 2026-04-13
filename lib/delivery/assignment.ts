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
 * 1. If there's an `upcoming` cycle whose cutoff hasn't passed → assign to that
 * 2. If the upcoming cycle's cutoff has passed → orphan (first_cycle_id = null)
 *    so the admin can backfill when ready
 * 3. If the current cycle is `delivered` (orders generated but still recent) → still assign
 *    and create a late-addition order immediately
 * 4. If no cycles available → orphan for later backfill
 */
export async function determineFirstCycle(): Promise<{
  cycleId: string;
  needsImmediateOrder: boolean;
}> {
  // Check for upcoming cycle (not yet generated)
  const upcoming = await getUpcomingCycle();
  if (upcoming) {
    // If cutoff has passed, don't assign — subscription becomes orphaned
    const cutoffAt = new Date(upcoming.order_cutoff_at);
    if (cutoffAt <= new Date()) {
      throw new Error('Крайният срок за поръчки за текущия цикъл е изтекъл.');
    }
    return { cycleId: upcoming.id, needsImmediateOrder: false };
  }

  // Check for delivered cycle (orders generated but still active - not archived)
  const delivered = await getActiveCycleWithStatus('delivered');
  if (delivered) {
    return { cycleId: delivered.id, needsImmediateOrder: true };
  }

  // Fallback: no available cycle — subscription will be orphaned
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
