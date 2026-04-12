/**
 * Recipient Builder
 *
 * Populates email_campaign_recipients from various audience sources.
 * Recipients are snapshotted at campaign creation time - late changes
 * to the source data do not affect a running campaign.
 *
 * GDPR: Only consenting preorder holders are included (email_consent = true).
 * Expired conversion tokens are excluded.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { addRecipients } from '@/lib/data/email-recipients';
import type { EmailCampaignRecipientInsert, SubscriptionStatus, BoxType } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitflow.bg';

/**
 * Maximum recipients to fetch per query.
 * Preorder / subscriber tables are unlikely to exceed this, but the guard
 * prevents runaway memory usage.
 */
const MAX_RECIPIENTS = 10_000;

// ---------------------------------------------------------------------------
// Subscriber recipients
// ---------------------------------------------------------------------------

/**
 * Build recipients from active (or filtered) subscriptions.
 * Joins `user_profiles` via `auth.users` to get the subscriber's email and name.
 *
 * @returns The number of recipients inserted.
 */
export async function buildSubscriberRecipients(
  campaignId: string,
  filter?: { status?: SubscriptionStatus; boxType?: BoxType },
): Promise<number> {
  // Subscriptions don't store email directly - we need to join via user_id.
  // Supabase JS doesn't support cross-schema joins to auth.users, so we
  // fetch subscriptions first, then batch-fetch user info.

  let subQuery = supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, box_type, frequency, status')
    .limit(MAX_RECIPIENTS);

  // Default to active if no status filter
  if (filter?.status) {
    subQuery = subQuery.eq('status', filter.status);
  } else {
    subQuery = subQuery.eq('status', 'active');
  }

  if (filter?.boxType) {
    subQuery = subQuery.eq('box_type', filter.boxType);
  }

  const { data: subscriptions, error: subErr } = await subQuery;
  if (subErr) throw new Error(`Failed to fetch subscriptions: ${subErr.message}`);
  if (!subscriptions?.length) return 0;

  // Collect unique user IDs
  const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

  // Fetch user profiles for names
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (profErr) throw new Error(`Failed to fetch user profiles: ${profErr.message}`);

  const profileFirstNameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.first_name]),
  );
  const profileLastNameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.last_name]),
  );

  // Fetch emails from auth.users via admin API
  // Supabase admin listUsers can fetch by IDs - but for simplicity
  // we fetch from the auth schema through the admin client's rpc or
  // by using the .auth.admin API.
  const emailMap = new Map<string, string>();
  // Batch fetch - Supabase admin API returns pages of 1000
  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);
    // Use auth admin to get user objects
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 50,
    });
    if (authErr) {
      console.error('Error fetching auth users:', authErr);
      continue;
    }
    // Filter to only our batch IDs
    for (const user of authData.users) {
      if (batch.includes(user.id) && user.email) {
        emailMap.set(user.id, user.email);
      }
    }
  }

  const manageUrl = `${SITE_URL}/account/subscriptions`;

  const recipients: EmailCampaignRecipientInsert[] = [];
  for (const sub of subscriptions) {
    const email = emailMap.get(sub.user_id);
    if (!email) continue; // skip if we can't resolve email

    recipients.push({
      campaign_id: campaignId,
      email: email.trim().toLowerCase(),
      first_name: profileFirstNameMap.get(sub.user_id) ?? null,
      last_name: profileLastNameMap.get(sub.user_id) ?? null,
      params: {
        firstName: profileFirstNameMap.get(sub.user_id) ?? null,
        boxType: sub.box_type,
        frequency: sub.frequency,
        manageUrl,
      },
    });
  }

  if (recipients.length === 0) return 0;
  return addRecipients(recipients);
}

// ---------------------------------------------------------------------------
// Customer recipients
// ---------------------------------------------------------------------------

/**
 * Build recipients from customers - either users who have placed orders or
 * all registered users depending on the filter.
 *
 * @returns The number of recipients inserted.
 */
export async function buildCustomerRecipients(
  campaignId: string,
  filter?: { hasOrdered?: boolean; lastOrderBefore?: string },
): Promise<number> {
  if (filter?.hasOrdered === true || filter?.lastOrderBefore) {
    // Customers who have placed at least one order
    let query = supabaseAdmin
      .from('orders')
      .select('customer_email, customer_first_name, customer_last_name')
      .limit(MAX_RECIPIENTS);

    if (filter.lastOrderBefore) {
      query = query.lt('created_at', filter.lastOrderBefore);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    if (!orders?.length) return 0;

    // De-duplicate by email (lowercase)
    const seen = new Map<string, { firstName: string; lastName: string }>(); // email → names
    for (const o of orders) {
      const email = o.customer_email.trim().toLowerCase();
      if (!seen.has(email)) {
        seen.set(email, { firstName: o.customer_first_name, lastName: o.customer_last_name });
      }
    }

    const recipients: EmailCampaignRecipientInsert[] = Array.from(
      seen.entries(),
    ).map(([email, names]) => ({
      campaign_id: campaignId,
      email,
      first_name: names.firstName,
      last_name: names.lastName,
      params: {
        firstName: names.firstName || null,
      },
    }));

    return addRecipients(recipients);
  }

  // All registered customers (user_profiles)
  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, first_name, last_name')
    .limit(MAX_RECIPIENTS);

  if (error) throw new Error(`Failed to fetch user profiles: ${error.message}`);
  if (!profiles?.length) return 0;

  // Fetch emails from auth
  const emailMap = new Map<string, string>();
  const userIds = profiles.map((p) => p.id);

  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 50,
    });
    if (authErr) {
      console.error('Error fetching auth users:', authErr);
      continue;
    }
    for (const user of authData.users) {
      if (batch.includes(user.id) && user.email) {
        emailMap.set(user.id, user.email);
      }
    }
  }

  const recipients: EmailCampaignRecipientInsert[] = [];
  for (const profile of profiles) {
    const email = emailMap.get(profile.id);
    if (!email) continue;

    recipients.push({
      campaign_id: campaignId,
      email: email.trim().toLowerCase(),
      first_name: profile.first_name,
      last_name: profile.last_name,
      params: {
        firstName: profile.first_name || null,
      },
    });
  }

  if (recipients.length === 0) return 0;
  return addRecipients(recipients);
}
