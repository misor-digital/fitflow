/**
 * Feedback Forms Data Access Layer
 *
 * CRUD for feedback forms, responses, and history.
 * Uses supabaseAdmin (service_role) - bypasses RLS.
 * Read functions wrapped in cache() for per-request deduplication.
 */

import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  FeedbackFormRow,
  FeedbackFormInsert,
  FeedbackFormUpdate,
  FeedbackResponseRow,
  FeedbackResponseInsert,
  FeedbackFormHistoryInsert,
  FeedbackFormHistoryRow,
  FeedbackFormSchema,
} from '@/lib/supabase/types';

// ============================================================================
// Constants
// ============================================================================

const MAX_FIELDS_PER_FORM = 30;
const MAX_SCHEMA_SIZE_BYTES = 50_000;
const VALID_FIELD_TYPES = new Set(['rating', 'text', 'textarea', 'select', 'multi_select', 'boolean', 'nps']);

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Validate a feedback form schema against the allowed structure.
 * Throws a descriptive error if the schema is invalid.
 */
export function validateFormSchema(schema: unknown): asserts schema is FeedbackFormSchema {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Невалидна схема: трябва да бъде обект.');
  }

  const s = schema as Record<string, unknown>;

  if (typeof s.version !== 'number' || s.version < 1) {
    throw new Error('Невалидна схема: version трябва да бъде число >= 1.');
  }

  if (!Array.isArray(s.fields)) {
    throw new Error('Невалидна схема: fields трябва да бъде масив.');
  }

  if (s.fields.length > MAX_FIELDS_PER_FORM) {
    throw new Error(`Невалидна схема: максимум ${MAX_FIELDS_PER_FORM} полета.`);
  }

  const rawSize = JSON.stringify(schema).length;
  if (rawSize > MAX_SCHEMA_SIZE_BYTES) {
    throw new Error(`Невалидна схема: максимален размер ${MAX_SCHEMA_SIZE_BYTES} байта.`);
  }

  const fieldIds = new Set<string>();

  for (const field of s.fields) {
    if (!field || typeof field !== 'object') {
      throw new Error('Невалидно поле: трябва да бъде обект.');
    }

    const f = field as Record<string, unknown>;

    if (typeof f.id !== 'string' || !/^[a-z0-9_]{1,50}$/.test(f.id)) {
      throw new Error(`Невалидно ID на поле: "${String(f.id)}". Позволени: a-z, 0-9, _ (макс. 50 символа).`);
    }

    if (fieldIds.has(f.id)) {
      throw new Error(`Дублиран ID на поле: "${f.id}".`);
    }
    fieldIds.add(f.id);

    if (typeof f.type !== 'string' || !VALID_FIELD_TYPES.has(f.type)) {
      throw new Error(`Невалиден тип поле: "${String(f.type)}". Позволени: ${[...VALID_FIELD_TYPES].join(', ')}.`);
    }

    if (typeof f.label !== 'string' || f.label.trim().length === 0) {
      throw new Error(`Поле "${f.id}" трябва да има етикет.`);
    }

    if (typeof f.required !== 'boolean') {
      throw new Error(`Поле "${f.id}": required трябва да бъде boolean.`);
    }

    // Optional image_url must be a string URL if provided
    if (f.image_url !== undefined && f.image_url !== null) {
      if (typeof f.image_url !== 'string' || f.image_url.trim().length === 0) {
        throw new Error(`Поле "${f.id}": image_url трябва да бъде валиден URL или null.`);
      }
      if (f.image_url.length > 2048) {
        throw new Error(`Поле "${f.id}": image_url е прекалено дълъг (макс. 2048 символа).`);
      }
    }

    // Select types must have choices
    if ((f.type === 'select' || f.type === 'multi_select') && !Array.isArray(f.choices)) {
      throw new Error(`Поле "${f.id}" (${f.type}) трябва да има choices масив.`);
    }

    if (Array.isArray(f.choices)) {
      if (f.choices.length === 0) {
        throw new Error(`Поле "${f.id}": choices не може да бъде празен.`);
      }
      if (f.choices.some((c: unknown) => typeof c !== 'string' || c.trim().length === 0)) {
        throw new Error(`Поле "${f.id}": всички choices трябва да бъдат непразни текстове.`);
      }
    }
  }
}

// ============================================================================
// Slug Validation
// ============================================================================

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

// ============================================================================
// Write Operations
// ============================================================================

export async function createFeedbackForm(
  data: FeedbackFormInsert,
): Promise<FeedbackFormRow> {
  validateFormSchema(data.schema);

  const { data: form, error } = await supabaseAdmin
    .from('feedback_forms')
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Формуляр с този slug вече съществува.');
    }
    console.error('Error creating feedback form:', error);
    throw new Error('Грешка при създаване на формуляр.');
  }

  return form as FeedbackFormRow;
}

export async function updateFeedbackForm(
  id: string,
  data: FeedbackFormUpdate,
): Promise<FeedbackFormRow> {
  if (data.schema) {
    validateFormSchema(data.schema);
  }

  const { data: form, error } = await supabaseAdmin
    .from('feedback_forms')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Формуляр с този slug вече съществува.');
    }
    console.error('Error updating feedback form:', error);
    throw new Error('Грешка при обновяване на формуляр.');
  }

  return form as FeedbackFormRow;
}

export async function deleteFeedbackForm(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('feedback_forms')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting feedback form:', error);
    throw new Error('Грешка при изтриване на формуляр.');
  }
}

// ============================================================================
// Read Operations (cached per request)
// ============================================================================

export const getFeedbackFormById = cache(async (id: string): Promise<FeedbackFormRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('feedback_forms')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching feedback form:', error);
    throw new Error('Грешка при зареждане на формуляр.');
  }

  return data as FeedbackFormRow;
});

export const getFeedbackFormBySlug = cache(async (slug: string): Promise<FeedbackFormRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('feedback_forms')
    .select()
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching feedback form by slug:', error);
    throw new Error('Грешка при зареждане на формуляр.');
  }

  return data as FeedbackFormRow;
});

export const getFeedbackFormsPaginated = cache(async (
  page: number,
  limit: number,
  filters?: { isActive?: boolean; search?: string },
): Promise<{ forms: FeedbackFormRow[]; total: number }> => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('feedback_forms')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching feedback forms:', error);
    throw new Error('Грешка при зареждане на формуляри.');
  }

  return {
    forms: (data ?? []) as FeedbackFormRow[],
    total: count ?? 0,
  };
});

// ============================================================================
// Response Operations
// ============================================================================

export async function createFeedbackResponse(
  data: FeedbackResponseInsert,
): Promise<FeedbackResponseRow> {
  const { data: response, error } = await supabaseAdmin
    .from('feedback_responses')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating feedback response:', error);
    throw new Error('Грешка при записване на отговор.');
  }

  return response as FeedbackResponseRow;
}

export const getResponsesByForm = cache(async (
  formId: string,
  page: number,
  limit: number,
): Promise<{ responses: FeedbackResponseRow[]; total: number }> => {
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabaseAdmin
    .from('feedback_responses')
    .select('*', { count: 'exact' })
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching feedback responses:', error);
    throw new Error('Грешка при зареждане на отговори.');
  }

  return {
    responses: (data ?? []) as FeedbackResponseRow[],
    total: count ?? 0,
  };
});

export const getResponseCountByForm = cache(async (formId: string): Promise<number> => {
  const { count, error } = await supabaseAdmin
    .from('feedback_responses')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', formId);

  if (error) {
    console.error('Error counting feedback responses:', error);
    return 0;
  }

  return count ?? 0;
});

/**
 * Check if a user has already submitted a response for a form.
 * Used when allowMultiple is false.
 */
export const hasUserResponded = cache(async (
  formId: string,
  userId: string,
): Promise<boolean> => {
  const { count, error } = await supabaseAdmin
    .from('feedback_responses')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', formId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error checking user response:', error);
    return false;
  }

  return (count ?? 0) > 0;
});

// ============================================================================
// History / Audit Operations
// ============================================================================

export async function recordFormAction(
  data: FeedbackFormHistoryInsert,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('feedback_form_history')
    .insert(data);

  if (error) {
    console.error('Error recording form history:', error);
    // Non-critical - don't throw
  }
}

export const getFormHistory = cache(async (
  formId: string,
): Promise<FeedbackFormHistoryRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('feedback_form_history')
    .select()
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching form history:', error);
    return [];
  }

  return (data ?? []) as FeedbackFormHistoryRow[];
});
