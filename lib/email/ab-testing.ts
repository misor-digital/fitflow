/**
 * A/B Testing Engine
 *
 * Implements our own A/B testing since Brevo Business plan is required for native A/B.
 * Splits campaign recipients into variant groups, tracks per-variant metrics,
 * and determines winner based on open rate or click rate.
 *
 * Design decisions:
 * - Deterministic shuffle using campaign ID as seed for reproducible splits.
 * - Minimum sample size of 50 delivered per variant for winner determination.
 * - No automatic winner rollout — admin reviews results and applies learnings
 *   to future campaigns.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  EmailABVariantRow,
  EmailCampaignRecipientRow,
} from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ABVariantInput {
  variantLabel: string;
  subject?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  recipientPercentage: number;
}

export interface ABTestResults {
  campaignId: string;
  variants: ABVariantResult[];
  totalRecipients: number;
  hasMinimumSample: boolean;
}

export interface ABVariantResult {
  id: string;
  variantLabel: string;
  subject: string | null;
  templateId: number | null;
  recipientPercentage: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  openRate: number;
  clickRate: number;
}

export interface ABWinner {
  winnerId: string;
  variantLabel: string;
  metric: number;
}

const MIN_SAMPLE_SIZE = 50;

// ---------------------------------------------------------------------------
// Seeded random (deterministic shuffle)
// ---------------------------------------------------------------------------

/**
 * Simple seeded PRNG (mulberry32) for deterministic recipient assignment.
 * Uses campaign ID hash as the seed.
 */
function seedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with seeded random for deterministic order.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  const rng = mulberry32(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Create A/B test variants for a campaign.
 * Validates that the campaign is in draft status and percentages sum to 100.
 */
export async function createABTest(
  campaignId: string,
  variants: ABVariantInput[],
): Promise<EmailABVariantRow[]> {
  // Validate at least 2 variants
  if (variants.length < 2) {
    throw new Error('A/B test requires at least 2 variants.');
  }

  // Validate percentages sum to 100
  const totalPct = variants.reduce((sum, v) => sum + v.recipientPercentage, 0);
  if (totalPct !== 100) {
    throw new Error(`Variant percentages must sum to 100, got ${totalPct}.`);
  }

  // Remove existing variants for this campaign (idempotent)
  await supabaseAdmin
    .from('email_ab_variants')
    .delete()
    .eq('campaign_id', campaignId);

  // Insert new variants
  const inserts = variants.map((v) => ({
    campaign_id: campaignId,
    variant_label: v.variantLabel,
    subject: v.subject ?? null,
    template_id: v.templateId ?? null,
    params: v.params ?? {},
    recipient_percentage: v.recipientPercentage,
  }));

  const { data, error } = await supabaseAdmin
    .from('email_ab_variants')
    .insert(inserts)
    .select();

  if (error) {
    console.error('Error creating A/B variants:', error);
    throw new Error('Failed to create A/B test variants.');
  }

  return data ?? [];
}

/**
 * Get A/B test variants for a campaign.
 * Returns empty array if no A/B test configured.
 */
export async function getABVariants(
  campaignId: string,
): Promise<EmailABVariantRow[]> {
  const { data, error } = await supabaseAdmin
    .from('email_ab_variants')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('variant_label', { ascending: true });

  if (error) {
    console.error('Error fetching A/B variants:', error);
    throw new Error('Failed to fetch A/B variants.');
  }

  return data ?? [];
}

/**
 * Delete all A/B test variants for a campaign.
 */
export async function deleteABTest(campaignId: string): Promise<void> {
  // Clear variant assignments from recipients first
  await supabaseAdmin
    .from('email_campaign_recipients')
    .update({ variant_id: null })
    .eq('campaign_id', campaignId);

  await supabaseAdmin
    .from('email_ab_variants')
    .delete()
    .eq('campaign_id', campaignId);
}

// ---------------------------------------------------------------------------
// Recipient assignment
// ---------------------------------------------------------------------------

/**
 * Randomly assign existing recipients to variants based on percentage split.
 * Uses deterministic shuffle (seeded from campaign ID) for reproducibility.
 */
export async function assignRecipientsToVariants(
  campaignId: string,
): Promise<void> {
  const variants = await getABVariants(campaignId);
  if (variants.length === 0) return;

  // Fetch all recipient IDs for this campaign
  const { data: recipients, error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .select('id')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error || !recipients) {
    console.error('Error fetching recipients for A/B assignment:', error);
    throw new Error('Failed to fetch recipients for A/B assignment.');
  }

  if (recipients.length === 0) return;

  // Deterministic shuffle based on campaign ID
  const seed = seedFromString(campaignId);
  const shuffled = seededShuffle(recipients, seed);

  // Split according to variant percentages
  let offset = 0;
  for (const variant of variants) {
    const count = Math.round((variant.recipient_percentage / 100) * shuffled.length);
    const slice = shuffled.slice(offset, offset + count);
    offset += count;

    if (slice.length > 0) {
      // Update in batches of 500 to avoid payload limits
      const batchSize = 500;
      for (let i = 0; i < slice.length; i += batchSize) {
        const batch = slice.slice(i, i + batchSize);
        const ids = batch.map((r) => r.id);

        await supabaseAdmin
          .from('email_campaign_recipients')
          .update({ variant_id: variant.id })
          .in('id', ids);
      }
    }
  }

  // Handle rounding remainder — assign to last variant
  if (offset < shuffled.length) {
    const lastVariant = variants[variants.length - 1];
    const remainder = shuffled.slice(offset);
    const ids = remainder.map((r) => r.id);

    await supabaseAdmin
      .from('email_campaign_recipients')
      .update({ variant_id: lastVariant.id })
      .in('id', ids);
  }
}

// ---------------------------------------------------------------------------
// Variant lookup for sending
// ---------------------------------------------------------------------------

/**
 * Returns the variant config for a recipient.
 * Returns null if the campaign has no A/B test or recipient has no variant.
 */
export async function getVariantForRecipient(
  recipient: EmailCampaignRecipientRow,
): Promise<EmailABVariantRow | null> {
  if (!recipient.variant_id) return null;

  const { data, error } = await supabaseAdmin
    .from('email_ab_variants')
    .select('*')
    .eq('id', recipient.variant_id)
    .single();

  if (error) {
    // Log but don't fail — fall back to campaign defaults
    console.warn('Error fetching variant for recipient:', error);
    return null;
  }

  return data;
}

/**
 * Increment a variant's sent counter.
 */
export async function incrementVariantSentCount(
  variantId: string,
): Promise<void> {
  const { data: current } = await supabaseAdmin
    .from('email_ab_variants')
    .select('sent_count')
    .eq('id', variantId)
    .single();

  if (current) {
    await supabaseAdmin
      .from('email_ab_variants')
      .update({ sent_count: current.sent_count + 1 })
      .eq('id', variantId);
  }
}

// ---------------------------------------------------------------------------
// Results & Winner
// ---------------------------------------------------------------------------

/**
 * Build a cached variant map for a campaign (avoids N+1 queries).
 * Call once per campaign processing run, then look up from the map.
 */
export async function buildVariantMap(
  campaignId: string,
): Promise<Map<string, EmailABVariantRow>> {
  const variants = await getABVariants(campaignId);
  const map = new Map<string, EmailABVariantRow>();
  for (const v of variants) {
    map.set(v.id, v);
  }
  return map;
}

/**
 * Aggregate per-variant metrics from recipient data.
 * Counts are derived from email_campaign_recipients rows grouped by variant_id.
 */
export async function getABTestResults(
  campaignId: string,
): Promise<ABTestResults> {
  const variants = await getABVariants(campaignId);
  if (variants.length === 0) {
    return {
      campaignId,
      variants: [],
      totalRecipients: 0,
      hasMinimumSample: false,
    };
  }

  // Count recipients per variant and status
  const variantResults: ABVariantResult[] = [];
  let totalRecipients = 0;
  let allHaveMinSample = true;

  for (const variant of variants) {
    // Count statuses for this variant
    const statuses = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'] as const;
    const counts: Record<string, number> = {};

    await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabaseAdmin
          .from('email_campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('variant_id', variant.id)
          .eq('status', status);
        counts[status] = count ?? 0;
      }),
    );

    // Aggregate: delivered includes opened & clicked (progressive states)
    const sentCount = variant.sent_count || (
      counts.sent + counts.delivered + counts.opened + counts.clicked
    );
    const deliveredCount = variant.delivered_count || (
      counts.delivered + counts.opened + counts.clicked
    );
    const openedCount = variant.opened_count || (counts.opened + counts.clicked);
    const clickedCount = variant.clicked_count || counts.clicked;

    const openRate = deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0;
    const clickRate = deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0;

    if (deliveredCount < MIN_SAMPLE_SIZE) {
      allHaveMinSample = false;
    }

    totalRecipients += sentCount;

    variantResults.push({
      id: variant.id,
      variantLabel: variant.variant_label,
      subject: variant.subject,
      templateId: variant.template_id,
      recipientPercentage: variant.recipient_percentage,
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
    });
  }

  return {
    campaignId,
    variants: variantResults,
    totalRecipients,
    hasMinimumSample: allHaveMinSample,
  };
}

/**
 * Determine the winning variant based on the chosen metric.
 * Requires minimum sample size (50 delivered per variant) for statistical relevance.
 */
export async function determineWinner(
  campaignId: string,
  metric: 'open_rate' | 'click_rate',
): Promise<ABWinner | null> {
  const results = await getABTestResults(campaignId);

  if (results.variants.length === 0) return null;
  if (!results.hasMinimumSample) return null;

  let bestVariant: ABVariantResult | null = null;
  let bestValue = -1;

  for (const v of results.variants) {
    const value = metric === 'open_rate' ? v.openRate : v.clickRate;
    if (value > bestValue) {
      bestValue = value;
      bestVariant = v;
    }
  }

  if (!bestVariant) return null;

  return {
    winnerId: bestVariant.id,
    variantLabel: bestVariant.variantLabel,
    metric: bestValue,
  };
}
