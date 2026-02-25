import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/dal';
import { ORDER_VIEW_ROLES } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// ============================================================================
// POST /api/admin/delivery/upload — Upload image to Supabase Storage
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.profile.user_type !== 'staff') {
      return NextResponse.json({ error: 'Неоторизиран достъп.' }, { status: 401 });
    }
    if (!session.profile.staff_role || !ORDER_VIEW_ROLES.has(session.profile.staff_role)) {
      return NextResponse.json({ error: 'Нямате достъп до тази операция.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const cycleId = formData.get('cycleId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Файлът е задължителен.' }, { status: 400 });
    }
    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId е задължителен.' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Невалиден формат. Позволени: JPG, PNG, WebP.' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Файлът е твърде голям. Максимум 5MB.' },
        { status: 400 },
      );
    }

    // Determine extension from content type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[file.type] || 'jpg';

    // Generate unique filename
    const uuid = crypto.randomUUID();
    const filePath = `${cycleId}/${uuid}.${ext}`;

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('box-contents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Грешка при качване на файла.' },
        { status: 500 },
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('box-contents')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (err) {
    console.error('Error in upload handler:', err);
    return NextResponse.json(
      { error: 'Грешка при качване на файла.' },
      { status: 500 },
    );
  }
}
