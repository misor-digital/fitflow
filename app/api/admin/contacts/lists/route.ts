import { NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { getBrevoLists } from '@/lib/email/brevo/contacts';
import { EMAIL_CONFIG } from '@/lib/email/client';

// ============================================================================
// GET /api/admin/contacts/lists — Fetch all Brevo lists with stats
// ============================================================================

export async function GET() {
  try {
    await requireAdmin();

    const { lists } = await getBrevoLists();

    // Map configured list IDs to their config keys
    const configuredIds: Record<number, string> = {};
    for (const [key, id] of Object.entries(EMAIL_CONFIG.lists)) {
      if (id) configuredIds[id] = key;
    }

    const enriched = lists.map((list) => ({
      ...list,
      isConfigured: list.id in configuredIds,
      configKey: configuredIds[list.id] ?? null,
    }));

    return NextResponse.json({ lists: enriched });
  } catch (error) {
    if (error instanceof AdminApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error('[Admin Contacts Lists] Error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на Brevo листите.' },
      { status: 500 },
    );
  }
}
