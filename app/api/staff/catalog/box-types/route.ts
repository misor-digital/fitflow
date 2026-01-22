/**
 * API Route: Box Types Management
 * GET /api/staff/catalog/box-types - List all box types
 * POST /api/staff/catalog/box-types - Create new box type
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyRole } from '@/lib/supabase/staffService';
import { listBoxTypes, createBoxType } from '@/lib/supabase/catalogService';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has catalog management roles
    const hasPermission = await hasAnyRole(user.id, [
      'super_admin',
      'admin_ops',
      'catalog_manager'
    ]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // List box types
    const result = await listBoxTypes();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      boxTypes: result.data,
    });
  } catch (error) {
    console.error('Error in box types list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has catalog management roles
    const hasPermission = await hasAnyRole(user.id, [
      'super_admin',
      'admin_ops',
      'catalog_manager'
    ]);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Only catalog managers can create box types' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, basePrice } = body;

    // Validate input
    if (!name || !description || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Name, description, and base price are required' },
        { status: 400 }
      );
    }

    if (typeof basePrice !== 'number' || basePrice < 0) {
      return NextResponse.json(
        { error: 'Base price must be a positive number' },
        { status: 400 }
      );
    }

    // Create box type
    const result = await createBoxType(
      {
        name: name.trim(),
        description: description.trim(),
        basePrice,
      },
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Box type created successfully',
      boxType: result.data,
    });
  } catch (error) {
    console.error('Error in box type create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
