/**
 * GET  /api/admin/feedback/upload - List existing images in the bucket
 * POST /api/admin/feedback/upload - Upload image to Supabase Storage
 *
 * POST accepts a multipart/form-data request with a single `file` field.
 * Stores in the `feedback-images` bucket under a UUID-based path.
 * Returns the public URL for embedding in the form field schema.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AdminApiError } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const BUCKET = 'feedback-images';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('Error listing feedback images:', error);
      return NextResponse.json({ error: 'Грешка при зареждане на снимките.' }, { status: 500 });
    }

    const images = (data ?? [])
      .filter(f => f.name && /\.(jpe?g|png|webp)$/i.test(f.name))
      .map(f => {
        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.name);
        return { name: f.name, url: urlData.publicUrl, createdAt: f.created_at };
      });

    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[feedback/upload GET]', err);
    return NextResponse.json({ error: 'Грешка при зареждане на снимките.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файлът е задължителен.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Невалиден формат. Позволени: JPG, PNG, WebP.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Файлът е твърде голям. Максимум 5 MB.' },
        { status: 400 },
      );
    }

    const ext = EXT_MAP[file.type] || 'jpg';
    const uuid = crypto.randomUUID();
    const filePath = `${uuid}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading feedback image:', uploadError);
      return NextResponse.json(
        { error: 'Грешка при качване на файла.' },
        { status: 500 },
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[feedback/upload POST]', err);
    return NextResponse.json(
      { error: 'Грешка при качване на файла.' },
      { status: 500 },
    );
  }
}
