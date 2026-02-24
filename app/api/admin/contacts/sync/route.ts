import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncCustomerContact, syncSubscriptionToContact, addToBrevoList, removeContactFromList } from '@/lib/email/brevo/contacts';
import { EMAIL_CONFIG } from '@/lib/email/client';

// ============================================================================
// POST /api/admin/contacts/sync — Manual full re-sync to Brevo
// ============================================================================

const BATCH_SIZE = 100;
const INTER_REQUEST_DELAY_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    const scope = (body.scope as string) || 'all';
    if (!['all', 'customers', 'subscribers', 'preorders'].includes(scope)) {
      return NextResponse.json(
        { error: 'Невалиден обхват. Позволени: all, customers, subscribers, preorders' },
        { status: 400 },
      );
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // ------------------------------------------------------------------
    // Sync customers (all user_profiles with auth users)
    // ------------------------------------------------------------------
    if (scope === 'all' || scope === 'customers') {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name, user_type')
          .range(offset, offset + BATCH_SIZE - 1)
          .order('created_at', { ascending: true });

        if (profileError) {
          errors.push(`Error fetching profiles at offset ${offset}: ${profileError.message}`);
          break;
        }

        if (!profiles || profiles.length === 0) {
          hasMore = false;
          break;
        }

        // Resolve emails from auth.users via admin API
        for (const profile of profiles) {
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
            const email = authUser?.user?.email;
            if (!email) continue;

            const nameParts = (profile.full_name ?? '').trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            const listIds = EMAIL_CONFIG.lists.customers
              ? [EMAIL_CONFIG.lists.customers]
              : undefined;

            const result = await syncCustomerContact(email, firstName, lastName, {
              USER_TYPE: profile.user_type as 'customer' | 'staff',
            }, listIds);

            if (result.success) {
              synced++;
            } else {
              failed++;
              if (errors.length < 50) {
                errors.push(`Customer ${email}: ${result.error}`);
              }
            }

            await delay(INTER_REQUEST_DELAY_MS);
          } catch (err) {
            failed++;
            if (errors.length < 50) {
              errors.push(`Customer ${profile.id}: ${String(err)}`);
            }
          }
        }

        offset += BATCH_SIZE;
        if (profiles.length < BATCH_SIZE) {
          hasMore = false;
        }
      }
    }

    // ------------------------------------------------------------------
    // Sync subscribers (all active/paused subscriptions)
    // ------------------------------------------------------------------
    if (scope === 'all' || scope === 'subscribers') {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: subs, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, box_type, status, frequency')
          .in('status', ['active', 'paused', 'cancelled', 'expired'])
          .range(offset, offset + BATCH_SIZE - 1)
          .order('created_at', { ascending: true });

        if (subError) {
          errors.push(`Error fetching subscriptions at offset ${offset}: ${subError.message}`);
          break;
        }

        if (!subs || subs.length === 0) {
          hasMore = false;
          break;
        }

        for (const sub of subs) {
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
            const email = authUser?.user?.email;
            if (!email) continue;

            const isActive = sub.status === 'active';
            const result = await syncSubscriptionToContact(
              email,
              isActive,
              sub.status,
              sub.box_type,
            );

            if (result.success) {
              // List management
              if (EMAIL_CONFIG.lists.subscribers) {
                if (isActive) {
                  await addToBrevoList(email, EMAIL_CONFIG.lists.subscribers);
                } else if (sub.status === 'cancelled' || sub.status === 'expired') {
                  await removeContactFromList(email, EMAIL_CONFIG.lists.subscribers);
                }
              }
              synced++;
            } else {
              failed++;
              if (errors.length < 50) {
                errors.push(`Subscription ${email}: ${result.error}`);
              }
            }

            await delay(INTER_REQUEST_DELAY_MS);
          } catch (err) {
            failed++;
            if (errors.length < 50) {
              errors.push(`Subscription ${sub.id}: ${String(err)}`);
            }
          }
        }

        offset += BATCH_SIZE;
        if (subs.length < BATCH_SIZE) {
          hasMore = false;
        }
      }
    }

    // ------------------------------------------------------------------
    // Sync preorders (pending preorders)
    // ------------------------------------------------------------------
    if (scope === 'all' || scope === 'preorders') {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: preorders, error: preorderError } = await supabaseAdmin
          .from('preorders')
          .select('id, email, full_name, box_type, conversion_status')
          .range(offset, offset + BATCH_SIZE - 1)
          .order('created_at', { ascending: true });

        if (preorderError) {
          errors.push(`Error fetching preorders at offset ${offset}: ${preorderError.message}`);
          break;
        }

        if (!preorders || preorders.length === 0) {
          hasMore = false;
          break;
        }

        for (const preorder of preorders) {
          try {
            const nameParts = (preorder.full_name ?? '').trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            const isPending = preorder.conversion_status === 'pending';
            const listIds = isPending && EMAIL_CONFIG.lists.preorders
              ? [EMAIL_CONFIG.lists.preorders]
              : undefined;

            const attributes: Record<string, string> = {
              BOX_TYPE: preorder.box_type ?? '',
            };
            if (!isPending) {
              attributes.CONVERTED_DATE = new Date().toISOString().split('T')[0];
            }

            const result = await syncCustomerContact(
              preorder.email,
              firstName,
              lastName,
              attributes,
              listIds,
            );

            if (result.success) {
              // Remove converted preorders from the preorders list
              if (!isPending && EMAIL_CONFIG.lists.preorders) {
                await removeContactFromList(preorder.email, EMAIL_CONFIG.lists.preorders);
              }
              synced++;
            } else {
              failed++;
              if (errors.length < 50) {
                errors.push(`Preorder ${preorder.email}: ${result.error}`);
              }
            }

            await delay(INTER_REQUEST_DELAY_MS);
          } catch (err) {
            failed++;
            if (errors.length < 50) {
              errors.push(`Preorder ${preorder.id}: ${String(err)}`);
            }
          }
        }

        offset += BATCH_SIZE;
        if (preorders.length < BATCH_SIZE) {
          hasMore = false;
        }
      }
    }

    return NextResponse.json({
      success: true,
      scope,
      synced,
      failed,
      errors: errors.slice(0, 20), // Limit error messages returned
    });
  } catch (error) {
    if (error instanceof AdminApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error('[Admin Contacts Sync] Error:', error);
    return NextResponse.json(
      { error: 'Грешка при синхронизация на контактите.' },
      { status: 500 },
    );
  }
}
