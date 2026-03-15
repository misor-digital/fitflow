/**
 * POST /api/feedback/[slug] — Public feedback form submission
 *
 * Rate-limited, validates answers against the form schema,
 * and supports both anonymous and authenticated submissions.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/utils/rateLimit';
import { verifySession } from '@/lib/auth/dal';
import {
  getFeedbackFormBySlug,
  createFeedbackResponse,
  hasUserResponded,
  validateFormSchema,
} from '@/lib/data/feedback-forms';
import type { FeedbackFormSchema } from '@/lib/supabase/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Validate submitted answers against the form schema.
 */
function validateAnswers(
  answers: Record<string, unknown>,
  schema: FeedbackFormSchema,
): string | null {
  for (const field of schema.fields) {
    const value = answers[field.id];

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      return `Полето "${field.label}" е задължително.`;
    }

    if (value === undefined || value === null || value === '') continue;

    switch (field.type) {
      case 'rating': {
        const max = (field.options?.max as number) || 5;
        if (typeof value !== 'number' || value < 1 || value > max || !Number.isInteger(value)) {
          return `"${field.label}": невалидна оценка (1-${max}).`;
        }
        break;
      }
      case 'nps': {
        if (typeof value !== 'number' || value < 0 || value > 10 || !Number.isInteger(value)) {
          return `"${field.label}": невалидна NPS стойност (0-10).`;
        }
        break;
      }
      case 'text': {
        if (typeof value !== 'string') return `"${field.label}": трябва да бъде текст.`;
        const maxLen = (field.options?.maxLength as number) || 500;
        if (value.length > maxLen) return `"${field.label}": максимум ${maxLen} символа.`;
        break;
      }
      case 'textarea': {
        if (typeof value !== 'string') return `"${field.label}": трябва да бъде текст.`;
        const maxLen = (field.options?.maxLength as number) || 2000;
        if (value.length > maxLen) return `"${field.label}": максимум ${maxLen} символа.`;
        break;
      }
      case 'select': {
        if (typeof value !== 'string') return `"${field.label}": трябва да бъде текст.`;
        if (field.choices && !field.choices.includes(value)) {
          return `"${field.label}": невалиден избор.`;
        }
        break;
      }
      case 'multi_select': {
        if (!Array.isArray(value)) return `"${field.label}": трябва да бъде масив.`;
        if (field.choices && value.some((v: unknown) => typeof v !== 'string' || !field.choices!.includes(v))) {
          return `"${field.label}": невалиден избор.`;
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') return `"${field.label}": трябва да бъде да/не.`;
        break;
      }
    }
  }

  // Strip any fields not in the schema (prevent extra data injection)
  const schemaIds = new Set(schema.fields.map(f => f.id));
  for (const key of Object.keys(answers)) {
    if (!schemaIds.has(key)) {
      delete answers[key];
    }
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const withinLimit = await checkRateLimit(`feedback:${ip}`, 10, 60);

    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Прекалено много заявки. Моля, опитайте по-късно.' },
        { status: 429 },
      );
    }

    const { slug } = await params;

    // Load form
    const form = await getFeedbackFormBySlug(slug);
    if (!form) {
      return NextResponse.json(
        { error: 'Формулярът не е намерен или не е активен.' },
        { status: 404 },
      );
    }

    // Parse body early so we can read the token
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалиден формат на заявката.' },
        { status: 400 },
      );
    }

    // Token-gated access
    if (form.access_token) {
      const token = typeof body.token === 'string' ? body.token : null;
      if (token !== form.access_token) {
        return NextResponse.json(
          { error: 'Невалиден или липсващ токен за достъп.' },
          { status: 403 },
        );
      }
    }

    // Check time window
    const now = new Date();
    if (form.starts_at && new Date(form.starts_at) > now) {
      return NextResponse.json(
        { error: 'Формулярът все още не е активен.' },
        { status: 403 },
      );
    }
    if (form.ends_at && new Date(form.ends_at) < now) {
      return NextResponse.json(
        { error: 'Формулярът вече не приема отговори.' },
        { status: 403 },
      );
    }

    // Check auth requirement
    const session = await verifySession().catch(() => null);
    const userId = session?.userId ?? null;

    if (form.settings.requireAuth && !userId) {
      return NextResponse.json(
        { error: 'Трябва да сте влезли в акаунта си, за да изпратите отговор.' },
        { status: 401 },
      );
    }

    // Check duplicate submission
    if (!form.settings.allowMultiple && userId) {
      const alreadySubmitted = await hasUserResponded(form.id, userId);
      if (alreadySubmitted) {
        return NextResponse.json(
          { error: 'Вече сте изпратили отговор за този формуляр.' },
          { status: 409 },
        );
      }
    }

    const answers = body.answers as Record<string, unknown> | undefined;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Липсва обект answers в заявката.' },
        { status: 400 },
      );
    }

    // Validate schema
    try {
      validateFormSchema(form.schema);
    } catch {
      return NextResponse.json(
        { error: 'Формулярът има невалидна конфигурация.' },
        { status: 500 },
      );
    }

    // Validate answers against schema
    const validationError = validateAnswers(answers, form.schema);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Save response
    const response = await createFeedbackResponse({
      form_id: form.id,
      form_version: form.version,
      user_id: userId,
      answers,
      metadata: {
        userAgent: headersList.get('user-agent') ?? undefined,
        locale: headersList.get('accept-language')?.split(',')[0] ?? undefined,
      },
    });

    return NextResponse.json(
      { data: { id: response.id }, message: form.settings.thankYouMessage || 'Благодарим за отговора!' },
      { status: 201 },
    );
  } catch (err) {
    console.error('[feedback/:slug POST]', err);
    return NextResponse.json({ error: 'Сървърна грешка.' }, { status: 500 });
  }
}
