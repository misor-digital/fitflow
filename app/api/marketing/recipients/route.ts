/**
 * Marketing Recipients API
 * Endpoints for managing marketing recipients
 * 
 * AUTHENTICATION: Requires admin user
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import {
  upsertRecipient,
  getRecipientsByFilter,
  bulkImportRecipients,
  type MarketingRecipientInsert,
  type RecipientFilter,
} from '@/lib/marketing';

/**
 * GET /api/marketing/recipients
 * List recipients with optional filtering
 * 
 * Query params:
 * - tags: comma-separated list of tags (must have ALL)
 * - tagsAny: comma-separated list of tags (must have ANY)
 * - excludeTags: comma-separated list of tags to exclude
 * - subscribedOnly: 'true' or 'false' (default: true)
 */
export async function GET(request: Request) {
  // Require admin authentication
  const { error: authError } = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    
    const filter: RecipientFilter = {
      subscribedOnly: searchParams.get('subscribedOnly') !== 'false',
    };

    const tags = searchParams.get('tags');
    if (tags) {
      filter.tags = tags.split(',').map(t => t.trim());
    }

    const tagsAny = searchParams.get('tagsAny');
    if (tagsAny) {
      filter.tagsAny = tagsAny.split(',').map(t => t.trim());
    }

    const excludeTags = searchParams.get('excludeTags');
    if (excludeTags) {
      filter.excludeTags = excludeTags.split(',').map(t => t.trim());
    }

    const { data: recipients, error } = await getRecipientsByFilter(filter);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: recipients?.length || 0,
      recipients,
    });

  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/recipients
 * Create or update a single recipient, or bulk import
 * 
 * Single: { email, name?, tags?, source? }
 * Bulk: { recipients: [{ email, name?, tags?, source? }, ...] }
 */
export async function POST(request: Request) {
  // Require admin authentication
  const { error: authError } = await requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();

    // Check if bulk import
    if (body.recipients && Array.isArray(body.recipients)) {
      const recipientsData: MarketingRecipientInsert[] = body.recipients.map(
        (r: { email: string; name?: string; tags?: string[]; source?: string }) => ({
          email: r.email,
          name: r.name || null,
          tags: r.tags || [],
          source: r.source || 'import',
        })
      );

      const { imported, errors } = await bulkImportRecipients(recipientsData);

      return NextResponse.json({
        success: true,
        imported,
        errors: errors.length > 0 ? errors : undefined,
      }, { status: 201 });
    }

    // Single recipient
    if (!body.email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    const recipientData: MarketingRecipientInsert = {
      email: body.email,
      name: body.name || null,
      tags: body.tags || [],
      source: body.source || 'api',
      metadata: body.metadata || null,
    };

    const { data: recipient, error } = await upsertRecipient(recipientData);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recipient,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating recipient:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
