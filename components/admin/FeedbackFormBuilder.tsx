'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { FeedbackFieldDefinition, FeedbackFieldType, FeedbackFormRow, FeedbackFormSettings } from '@/lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

type WizardStep = 'basics' | 'fields' | 'settings' | 'preview' | 'review';

interface FormData {
  title: string;
  slug: string;
  description: string;
  fields: FeedbackFieldDefinition[];
  settings: FeedbackFormSettings;
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'basics', label: 'Основни' },
  { key: 'fields', label: 'Полета' },
  { key: 'settings', label: 'Настройки' },
  { key: 'preview', label: 'Преглед' },
  { key: 'review', label: 'Потвърждение' },
];

const FIELD_TYPES: { value: FeedbackFieldType; label: string; icon: string }[] = [
  { value: 'rating', label: 'Оценка (1-5)', icon: '⭐' },
  { value: 'nps', label: 'NPS (0-10)', icon: '📊' },
  { value: 'text', label: 'Кратък текст', icon: '✏️' },
  { value: 'textarea', label: 'Дълъг текст', icon: '📝' },
  { value: 'select', label: 'Избор (един)', icon: '🔘' },
  { value: 'multi_select', label: 'Избор (много)', icon: '☑️' },
  { value: 'boolean', label: 'Да / Не', icon: '👍' },
];

// ============================================================================
// Helper: slug generation with Bulgarian Cyrillic → Latin transliteration
// ============================================================================

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

function transliterate(text: string): string {
  return text
    .split('')
    .map(ch => CYR_TO_LAT[ch] ?? CYR_TO_LAT[ch.toLowerCase()] ?? ch)
    .join('');
}

function toSlug(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Lighter sanitiser for manual slug typing — strips non-Latin chars without transliteration. */
function sanitiseSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ============================================================================
// Sub-component: Image upload for a field
// ============================================================================

function FieldImageUpload({
  imageUrl,
  onUploaded,
  onRemove,
}: {
  imageUrl: string | null;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [gallery, setGallery] = useState<{ name: string; url: string }[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  async function loadGallery() {
    if (showGallery) {
      setShowGallery(false);
      return;
    }
    setGalleryLoading(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/admin/feedback/upload');
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? 'Грешка при зареждане.');
        return;
      }
      setGallery(data.images ?? []);
      setShowGallery(true);
    } catch {
      setUploadError('Неочаквана грешка при зареждане.');
    } finally {
      setGalleryLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/admin/feedback/upload', {
        method: 'POST',
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? 'Грешка при качване.');
        return;
      }

      onUploaded(data.url);
      setShowGallery(false);
    } catch {
      setUploadError('Неочаквана грешка при качване.');
    } finally {
      setUploading(false);
      // Clear input so the same file can be re-selected
      e.target.value = '';
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Снимка към въпроса (по избор)
      </label>

      {imageUrl ? (
        <div className="flex items-start gap-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Преглед"
              className="max-h-24 rounded border border-gray-200"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:underline mt-1"
          >
            Премахни
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm cursor-pointer hover:border-[var(--color-brand-orange)] hover:bg-orange-50/30 transition-colors">
              <span>{uploading ? 'Качване...' : '📷 Качи снимка'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={loadGallery}
              disabled={galleryLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:border-[var(--color-brand-orange)] hover:bg-orange-50/30 transition-colors"
            >
              {galleryLoading ? 'Зареждане...' : '🖼️ Избери от качени'}
            </button>
          </div>
          <p className="text-xs text-gray-400">JPG, PNG или WebP. Макс. 5 MB.</p>

          {showGallery && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              {gallery.length === 0 ? (
                <p className="text-xs text-gray-400">Няма качени снимки.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {gallery.map(img => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => {
                        onUploaded(img.url);
                        setShowGallery(false);
                      }}
                      className="group relative rounded border border-gray-200 overflow-hidden hover:border-[var(--color-brand-orange)] hover:ring-2 hover:ring-orange-200 transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 mt-1">{uploadError}</p>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function FeedbackFormBuilder({ initialForm }: { initialForm?: FeedbackFormRow } = {}) {
  const isEditing = !!initialForm;
  const router = useRouter();
  const slugRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>('basics');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(() => {
    if (initialForm) {
      return {
        title: initialForm.title,
        slug: initialForm.slug,
        description: initialForm.description ?? '',
        fields: (initialForm.schema.fields ?? []).map((f, i) => ({ ...f, _key: `_k${i}` })),
        settings: initialForm.settings ?? {
          requireAuth: false,
          allowMultiple: false,
          thankYouMessage: 'Благодарим за обратната връзка!',
        },
      };
    }
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const yyyy = now.getFullYear();
    return {
      title: '',
      slug: `${month}-${yyyy}`,
      description: '',
      fields: [],
      settings: {
        requireAuth: false,
        allowMultiple: false,
        thankYouMessage: 'Благодарим за обратната връзка!',
      },
    };
  });

  // Counter for generating unique field IDs
  const [fieldCounter, setFieldCounter] = useState(initialForm?.schema.fields?.length ?? 0);

  // Field being edited
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  // ---------- Navigation ----------

  function canProceed(): boolean {
    switch (step) {
      case 'basics':
        return formData.title.trim().length > 0 && formData.slug.trim().length >= 3;
      case 'fields':
        return formData.fields.length > 0;
      case 'settings':
      case 'preview':
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    if (!canProceed()) return;
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].key);
      setError(null);
    }
  }

  function goBack() {
    const idx = currentStepIndex;
    if (idx > 0) {
      setStep(STEPS[idx - 1].key);
      setError(null);
    }
  }

  // ---------- Field management ----------

  function addField(type: FeedbackFieldType) {
    const id = `field_${fieldCounter}`;
    const _key = `_k${fieldCounter}`;
    setFieldCounter(c => c + 1);
    const newField: FeedbackFieldDefinition = {
      id,
      _key,
      type,
      label: '',
      required: false,
      ...(type === 'select' || type === 'multi_select' ? { choices: [''] } : {}),
      ...(type === 'rating' ? { options: { max: 5 } } : {}),
    };
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setEditingFieldIndex(formData.fields.length);
  }

  function updateField(index: number, updates: Partial<FeedbackFieldDefinition>) {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }));
  }

  function removeField(index: number) {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
    setEditingFieldIndex(null);
  }

  function moveField(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.fields.length) return;
    setFormData(prev => {
      const fields = [...prev.fields];
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      return { ...prev, fields };
    });
    setEditingFieldIndex(newIndex);
  }

  // ---------- Submit ----------

  async function handleSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        const url = isEditing
          ? `/api/admin/feedback/${initialForm!.id}`
          : '/api/admin/feedback';
        const method = isEditing ? 'PATCH' : 'POST';

        const payload: Record<string, unknown> = {
          title: formData.title.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim() || null,
          schema: {
            version: 1,
            fields: formData.fields.map(({ _key, ...rest }) => rest),
          },
          settings: formData.settings,
        };

        if (!isEditing) {
          payload.accessToken = formData.settings.requireToken
            ? crypto.randomUUID().replace(/-/g, '')
            : null;
        }

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? (isEditing ? 'Грешка при обновяване.' : 'Грешка при създаване.'));
          return;
        }

        router.push(`/admin/feedback/${data.data.id}`);
        router.refresh();
      } catch {
        setError('Неочаквана грешка. Моля, опитайте отново.');
      }
    });
  }

  // ---------- Render helpers ----------

  function hasChanges(): boolean {
    if (!initialForm) return true;
    const stable = (v: unknown): string =>
      JSON.stringify(v, (_, val) =>
        val && typeof val === 'object' && !Array.isArray(val)
          ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
          : val,
      );
    const cleanFields = formData.fields.map(({ _key, ...rest }) => rest);
    const newSchema = { version: 1, fields: cleanFields };
    if (stable(newSchema) !== stable(initialForm.schema)) return true;
    if (formData.title.trim() !== initialForm.title) return true;
    if (formData.slug.trim() !== initialForm.slug) return true;
    if ((formData.description.trim() || null) !== (initialForm.description ?? null)) return true;
    if (stable(formData.settings) !== stable(initialForm.settings)) return true;
    return false;
  }

  function renderFieldTypeLabel(type: FeedbackFieldType): string {
    return FIELD_TYPES.find(t => t.value === type)?.label ?? type;
  }

  // ---------- Step: Basics ----------

  function renderBasics() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Заглавие <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => {
              const title = e.target.value;
              setFormData(prev => ({
                ...prev,
                title,
                slug: prev.slug === toSlug(prev.title) ? toSlug(title) : prev.slug,
              }));
            }}
            placeholder="напр. Оценка на март 2026 кутия"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/feedback/</span>
            <input
              ref={slugRef}
              type="text"
              value={formData.slug}
              onChange={e => {
                const input = e.target;
                const raw = input.value;
                const pos = input.selectionStart ?? raw.length;
                const before = raw.slice(0, pos);
                const sanitised = sanitiseSlug(raw);
                const newPos = sanitiseSlug(before).length;
                setFormData(prev => ({ ...prev, slug: sanitised }));
                requestAnimationFrame(() => {
                  input.setSelectionRange(newPos, newPos);
                });
              }}
              placeholder="mart-2026-kutia"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              maxLength={80}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Само латински букви (a-z), цифри и тирета.</p>
          {formData.slug && formData.slug.length < 3 && (
            <p className="text-xs text-red-500 mt-1">Slug трябва да бъде поне 3 символа.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание (по избор)
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Кратко описание, което ще се показва над формуляра..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={3}
            maxLength={1000}
          />
        </div>
      </div>
    );
  }

  // ---------- Step: Fields ----------

  function renderFields() {
    return (
      <div className="space-y-4">
        {/* Existing fields */}
        {formData.fields.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            Добавете полета от менюто по-долу.
          </p>
        )}

        {formData.fields.map((field, index) => (
          <div
            key={field._key ?? field.id}
            className={`border rounded-lg p-4 ${
              editingFieldIndex === index
                ? 'border-[var(--color-brand-orange)] bg-orange-50/30'
                : 'border-gray-200'
            }`}
          >
            {/* Field header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                  {renderFieldTypeLabel(field.type)}
                </span>
                {field.required && (
                  <span className="text-xs text-red-500 font-medium">Задължително</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Преместване нагоре"
                >↑</button>
                <button
                  type="button"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === formData.fields.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Преместване надолу"
                >↓</button>
                <button
                  type="button"
                  onClick={() => setEditingFieldIndex(editingFieldIndex === index ? null : index)}
                  className="p-1 text-gray-400 hover:text-[var(--color-brand-orange)]"
                  title="Редактиране"
                >✏️</button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Изтриване"
                >🗑️</button>
              </div>
            </div>

            {/* Field label display */}
            <p className="text-sm font-medium">
              {field.label || <span className="text-gray-300 italic">Без етикет</span>}
            </p>

            {/* Expanded editor */}
            {editingFieldIndex === index && (
              <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Етикет</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => updateField(index, { label: e.target.value })}
                    placeholder="напр. Как оценявате кутията?"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    maxLength={300}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ID на полето</label>
                  <input
                    type="text"
                    value={field.id}
                    onChange={e => {
                      const input = e.target;
                      const raw = input.value;
                      const pos = input.selectionStart ?? raw.length;
                      const before = raw.slice(0, pos);
                      const newId = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      const newPos = before.toLowerCase().replace(/[^a-z0-9_]/g, '').length;
                      updateField(index, { id: newId });
                      requestAnimationFrame(() => {
                        input.setSelectionRange(newPos, newPos);
                      });
                    }}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Само латински букви (a-z), цифри и долна черта (_).</p>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => updateField(index, { required: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Задължително поле</span>
                </label>

                {/* Image upload */}
                <FieldImageUpload
                  imageUrl={field.image_url ?? null}
                  onUploaded={url => updateField(index, { image_url: url })}
                  onRemove={() => updateField(index, { image_url: null })}
                />

                {/* Choices editor for select/multi_select */}
                {(field.type === 'select' || field.type === 'multi_select') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Опции</label>
                    {(field.choices ?? []).map((choice, ci) => (
                      <div key={ci} className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={choice}
                          onChange={e => {
                            const choices = [...(field.choices ?? [])];
                            choices[ci] = e.target.value;
                            updateField(index, { choices });
                          }}
                          placeholder={`Опция ${ci + 1}`}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const choices = (field.choices ?? []).filter((_, j) => j !== ci);
                            updateField(index, { choices: choices.length ? choices : [''] });
                          }}
                          className="text-gray-400 hover:text-red-500 text-sm"
                        >✕</button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateField(index, { choices: [...(field.choices ?? []), ''] })}
                      className="text-xs text-[var(--color-brand-orange)] hover:underline mt-1"
                    >
                      + Добави опция
                    </button>
                  </div>
                )}

                {/* Rating max */}
                {field.type === 'rating' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Максимална оценка</label>
                    <select
                      value={(field.options?.max as number) ?? 5}
                      onChange={e => updateField(index, { options: { ...field.options, max: Number(e.target.value) } })}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    >
                      {[3, 4, 5, 7, 10].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Text max length */}
                {(field.type === 'text' || field.type === 'textarea') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Макс. дължина</label>
                    <input
                      type="number"
                      value={(field.options?.maxLength as number) ?? (field.type === 'text' ? 500 : 2000)}
                      onChange={e => updateField(index, { options: { ...field.options, maxLength: Number(e.target.value) } })}
                      min={1}
                      max={5000}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add field buttons */}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
            Добави поле
          </p>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map(ft => (
              <button
                key={ft.value}
                type="button"
                onClick={() => addField(ft.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:border-[var(--color-brand-orange)] hover:bg-orange-50/30 transition-colors"
              >
                <span>{ft.icon}</span>
                <span>{ft.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Step: Settings ----------

  function renderSettings() {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
          <input
            type="checkbox"
            checked={formData.settings.requireAuth ?? false}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, requireAuth: e.target.checked },
            }))}
            className="rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Изисквай вход</p>
            <p className="text-xs text-gray-500">Потребителите трябва да влязат в акаунта си, за да отговорят.</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
          <input
            type="checkbox"
            checked={formData.settings.allowMultiple ?? false}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, allowMultiple: e.target.checked },
            }))}
            className="rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Позволи повече от един отговор</p>
            <p className="text-xs text-gray-500">Един потребител може да изпрати отговор повече от веднъж.</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
          <input
            type="checkbox"
            checked={formData.settings.requireToken ?? false}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, requireToken: e.target.checked },
            }))}
            className="rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Ограничен достъп (само с линк)</p>
            <p className="text-xs text-gray-500">Формулярът е достъпен само чрез специален линк, изпратен по имейл.</p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Съобщение след изпращане
          </label>
          <input
            type="text"
            value={formData.settings.thankYouMessage ?? ''}
            onChange={e => setFormData(prev => ({
              ...prev,
              settings: { ...prev.settings, thankYouMessage: e.target.value },
            }))}
            placeholder="Благодарим за обратната връзка!"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            maxLength={500}
          />
        </div>
      </div>
    );
  }

  // ---------- Step: Preview ----------

  function renderPreview() {
    return (
      <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[var(--color-brand-navy)] mb-1">
          {formData.title || 'Без заглавие'}
        </h2>
        {formData.description && (
          <p className="text-sm text-gray-600">{formData.description}</p>
        )}
        <hr className="border-gray-200 my-4" />

        <div className="space-y-6">
          {formData.fields.map(field => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label || '(без етикет)'}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={field.image_url}
                  alt={field.label}
                  className="max-h-40 rounded-lg border border-gray-200 mb-2"
                />
              )}

              {field.type === 'rating' && (
                <div className="flex gap-1">
                  {Array.from({ length: (field.options?.max as number) || 5 }, (_, i) => (
                    <button key={i} type="button" className="text-2xl text-gray-300 hover:text-yellow-400 transition-colors">
                      ★
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'nps' && (
                <div className="flex gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-8 h-8 text-xs border border-gray-300 rounded hover:bg-[var(--color-brand-orange)] hover:text-white transition-colors"
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'text' && (
                <input type="text" disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" placeholder="Кратък текст..." />
              )}

              {field.type === 'textarea' && (
                <textarea disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" rows={3} placeholder="Дълъг текст..." />
              )}

              {field.type === 'select' && (
                <select disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50">
                  <option>Изберете...</option>
                  {field.choices?.map((c, i) => <option key={i}>{c}</option>)}
                </select>
              )}

              {field.type === 'multi_select' && (
                <div className="space-y-1">
                  {field.choices?.map((c, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" disabled className="rounded" />
                      {c}
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'boolean' && (
                <div className="flex gap-3">
                  <button type="button" className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-green-50">Да</button>
                  <button type="button" className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-red-50">Не</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button type="button" disabled className="w-full bg-[var(--color-brand-orange)] text-white py-3 rounded-lg text-sm font-semibold opacity-60">
            Изпрати
          </button>
        </div>
      </div>
    );
  }

  // ---------- Step: Review ----------

  function renderReview() {
    const hi = 'bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded';

    const stable = (v: unknown): string =>
      JSON.stringify(v, (_, val) =>
        val && typeof val === 'object' && !Array.isArray(val)
          ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
          : val,
      );

    const isTitleChanged = isEditing && formData.title.trim() !== (initialForm?.title ?? '');
    const isSlugChanged = isEditing && formData.slug.trim() !== (initialForm?.slug ?? '');
    const isAuthChanged = isEditing && (formData.settings.requireAuth ?? false) !== (initialForm?.settings?.requireAuth ?? false);
    const isMultipleChanged = isEditing && (formData.settings.allowMultiple ?? false) !== (initialForm?.settings?.allowMultiple ?? false);
    const isTokenChanged = isEditing && (formData.settings.requireToken ?? false) !== (initialForm?.settings?.requireToken ?? false);
    const isThankYouChanged = isEditing && (formData.settings.thankYouMessage ?? '') !== (initialForm?.settings?.thankYouMessage ?? '');

    // Per-field diff — match by _key (stable across ID renames)
    const oldFieldsByKey = new Map(
      (initialForm?.schema.fields ?? []).map((f, i) => [`_k${i}`, f]),
    );
    const getOldField = (f: FeedbackFieldDefinition) =>
      f._key ? oldFieldsByKey.get(f._key) : undefined;
    const isFieldChanged = (f: FeedbackFieldDefinition): boolean => {
      if (!isEditing) return false;
      const old = getOldField(f);
      if (!old) return true; // new field
      const { _key: _a, ...fClean } = f;
      const { _key: _b, ...oClean } = old;
      return stable(fClean) !== stable(oClean);
    };

    return (
      <div className="space-y-4">
        {isEditing && hasChanges() && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <span className={`inline-block text-[10px] ${hi}`}>нов</span>
            Промените са маркирани.
          </p>
        )}

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Заглавие:</span>
            <span className={`font-medium ${isTitleChanged ? hi : ''}`}>{formData.title}</span>
          </div>
          {isTitleChanged && (
            <p className="text-[11px] text-gray-400 text-right">преди: {initialForm!.title}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">URL:</span>
            <span className={`font-mono text-xs ${isSlugChanged ? hi : ''}`}>/feedback/{formData.slug}</span>
          </div>
          {isSlugChanged && (
            <p className="text-[11px] text-gray-400 text-right">преди: /feedback/{initialForm!.slug}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Полета:</span>
            <span className="font-medium">{formData.fields.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Изисква вход:</span>
            <span className={isAuthChanged ? hi : ''}>{formData.settings.requireAuth ? 'Да' : 'Не'}</span>
          </div>
          {isAuthChanged && (
            <p className="text-[11px] text-gray-400 text-right">преди: {initialForm!.settings?.requireAuth ? 'Да' : 'Не'}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Множество отговори:</span>
            <span className={isMultipleChanged ? hi : ''}>{formData.settings.allowMultiple ? 'Да' : 'Не'}</span>
          </div>
          {isMultipleChanged && (
            <p className="text-[11px] text-gray-400 text-right">преди: {initialForm!.settings?.allowMultiple ? 'Да' : 'Не'}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Ограничен достъп:</span>
            <span className={isTokenChanged ? hi : ''}>{formData.settings.requireToken ? 'Да (само с линк)' : 'Не (публичен)'}</span>
          </div>
          {isTokenChanged && (
            <p className="text-[11px] text-gray-400 text-right">преди: {initialForm!.settings?.requireToken ? 'Да (само с линк)' : 'Не (публичен)'}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Съобщение след изпращане:</span>
            <span className={`text-right max-w-[60%] ${isThankYouChanged ? hi : ''}`}>{formData.settings.thankYouMessage || '(няма)'}</span>
          </div>
          {isThankYouChanged && (
            <p className="text-[11px] text-gray-400 text-right">преди: {initialForm!.settings?.thankYouMessage || '(няма)'}</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Полета:</h3>
          {(() => {
            // Merge current + removed fields in original order (match by _key)
            const oldKeys = (initialForm?.schema.fields ?? []).map((_, i) => `_k${i}`);
            type Entry = { field: FeedbackFieldDefinition; removed: boolean };
            const entries: Entry[] = [];
            // Build entries: use formData.fields order as source of truth,
            // interleave removed fields at their original relative position.
            const currentKeys = new Set(formData.fields.map(f => f._key).filter(Boolean));
            const removedFields = oldKeys
              .filter(k => !currentKeys.has(k))
              .map(k => ({ field: oldFieldsByKey.get(k)!, key: k }));

            // Map each current field to its original index (if it existed)
            const oldKeyIndex = new Map(oldKeys.map((k, i) => [k, i]));

            // Walk formData.fields in user's order; before each, insert any
            // removed fields whose original index is <= this field's original index
            let removedIdx = 0;
            for (const f of formData.fields) {
              const curOrigIdx = f._key ? (oldKeyIndex.get(f._key) ?? Infinity) : Infinity;
              while (removedIdx < removedFields.length) {
                const rOrigIdx = oldKeyIndex.get(removedFields[removedIdx].key) ?? Infinity;
                if (rOrigIdx <= curOrigIdx) {
                  entries.push({ field: removedFields[removedIdx].field, removed: true });
                  removedIdx++;
                } else break;
              }
              entries.push({ field: f, removed: false });
            }
            // Append any remaining removed fields
            while (removedIdx < removedFields.length) {
              entries.push({ field: removedFields[removedIdx].field, removed: true });
              removedIdx++;
            }

            let num = 0;
            return (
              <div className="space-y-1 text-sm text-gray-600">
                {entries.map(({ field: f, removed }) => {
                  if (removed) {
                    return (
                      <div key={f.id} className="bg-red-50 rounded px-1.5 py-0.5 text-red-400 pl-6">
                        {f.label || '(без етикет)'} — <span>{renderFieldTypeLabel(f.type)}</span>
                        <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">премахнато</span>
                      </div>
                    );
                  }
                  num++;
                  const fChanged = isFieldChanged(f);
                  const isNew = isEditing && !getOldField(f);
                  const old = getOldField(f);

                  // Per-property diffs
                  const diffs: { prop: string; now: string; before: string }[] = [];
                  const imgChanged = old && fChanged && !isNew && (f.image_url ?? '') !== (old.image_url ?? '');
                  if (old && fChanged && !isNew) {
                    if (f.id !== old.id)
                      diffs.push({ prop: 'ID', now: f.id, before: old.id });
                    if (f.label !== old.label)
                      diffs.push({ prop: 'Етикет', now: f.label || '(празно)', before: old.label || '(празно)' });
                    if (f.type !== old.type)
                      diffs.push({ prop: 'Тип', now: renderFieldTypeLabel(f.type), before: renderFieldTypeLabel(old.type) });
                    if (f.required !== old.required)
                      diffs.push({ prop: 'Задължително', now: f.required ? 'Да' : 'Не', before: old.required ? 'Да' : 'Не' });
                    if (JSON.stringify(f.choices ?? []) !== JSON.stringify(old.choices ?? []))
                      diffs.push({ prop: 'Опции', now: (f.choices ?? []).join(', ') || '(няма)', before: (old.choices ?? []).join(', ') || '(няма)' });
                    if (stable(f.options ?? {}) !== stable(old.options ?? {})) {
                      const fmt = (o: Record<string, unknown>) =>
                        Object.entries(o).map(([k, v]) => {
                          if (k === 'max') return `Макс. стойност: ${v}`;
                          if (k === 'maxLength') return `Макс. дължина: ${v}`;
                          return `${k}: ${v}`;
                        }).join(', ') || '(няма)';
                      diffs.push({ prop: 'Настройки', now: fmt(f.options ?? {}), before: fmt(old.options ?? {}) });
                    }
                  }

                  return (
                    <div key={f._key ?? f.id} className={fChanged ? 'bg-amber-50 rounded px-1.5 py-0.5' : ''}>
                      <span className="text-gray-400 inline-block w-5 text-right mr-1">{num}.</span>
                      {f.label || '(без етикет)'} — <span className="text-gray-400">{renderFieldTypeLabel(f.type)}</span>
                      {f.required && <span className="text-red-500 ml-1">*</span>}
                      {isNew && <span className={`ml-2 text-[10px] ${hi}`}>ново</span>}
                      {fChanged && !isNew && <span className={`ml-2 text-[10px] ${hi}`}>променено</span>}
                      {diffs.map(d => (
                        <div key={d.prop} className="pl-6 text-[11px]">
                          <span className="text-gray-500">{d.prop}: </span>
                          <span className={hi}>{d.now}</span>
                          <span className="text-gray-400 ml-2">преди: {d.before}</span>
                        </div>
                      ))}
                      {imgChanged && (
                        <div className="pl-6 text-[11px] mt-1">
                          <span className="text-gray-500">Изображение:</span>
                          <div className="flex items-start gap-4 mt-1">
                            <div className="text-center">
                              <span className="text-amber-600 text-[10px] block mb-0.5">ново:</span>
                              {f.image_url ? (
                                <>
                                  <Image src={f.image_url} alt="ново" width={80} height={80} className="w-20 h-20 object-cover rounded border-2 border-amber-300" />
                                  <a href={f.image_url} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-blue-500 hover:underline mt-0.5 max-w-[80px] truncate">линк</a>
                                </>
                              ) : (
                                <span className="text-gray-400">(няма)</span>
                              )}
                            </div>
                            <span className="text-gray-300 self-center">←</span>
                            <div className="text-center">
                              <span className="text-gray-400 text-[10px] block mb-0.5">преди:</span>
                              {old!.image_url ? (
                                <>
                                  <Image src={old!.image_url} alt="преди" width={80} height={80} className="w-20 h-20 object-cover rounded border border-gray-200 opacity-60" />
                                  <a href={old!.image_url} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-gray-400 hover:underline mt-0.5 max-w-[80px] truncate">линк</a>
                                </>
                              ) : (
                                <span className="text-gray-400">(няма)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // ---------- Main render ----------

  return (
    <div className="max-w-3xl mx-auto [&_button]:cursor-pointer" data-has-changes={hasChanges() ? 'true' : 'false'}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <button
              type="button"
              onClick={() => i < currentStepIndex && setStep(s.key)}
              disabled={i >= currentStepIndex}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                i === currentStepIndex
                  ? 'bg-[var(--color-brand-orange)] text-white'
                  : i < currentStepIndex
                    ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < currentStepIndex ? '✓' : i + 1}
            </button>
            <button
              type="button"
              onClick={() => i < currentStepIndex && setStep(s.key)}
              disabled={i >= currentStepIndex}
              className={`ml-1.5 text-xs hidden sm:inline ${
                i === currentStepIndex
                  ? 'font-semibold text-[var(--color-brand-navy)]'
                  : i < currentStepIndex
                    ? 'text-gray-600 hover:text-[var(--color-brand-orange)] cursor-pointer'
                    : 'text-gray-400'
              }`}
            >
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <h2 className="text-lg font-bold text-[var(--color-brand-navy)] mb-4">
        {STEPS[currentStepIndex].label}
      </h2>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {step === 'basics' && renderBasics()}
        {step === 'fields' && renderFields()}
        {step === 'settings' && renderSettings()}
        {step === 'preview' && renderPreview()}
        {step === 'review' && renderReview()}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStepIndex === 0}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30"
        >
          ← Назад
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const dest = isEditing ? `/admin/feedback/${initialForm!.id}` : '/admin/feedback';
              if (hasChanges() && !confirm('Ще загубите направените промени, ако се върнете сега.')) return;
              router.push(dest);
            }}
            className="px-6 py-2 rounded-lg text-sm font-semibold border border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] hover:bg-gray-50"
          >
            {isEditing ? '← Към формуляра' : '← Към списъка'}
          </button>
          {step === 'review' ? (
            isEditing && !hasChanges() ? (
              <span className="px-6 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-400">
                Няма промени
              </span>
            ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-[var(--color-brand-orange)] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isPending ? (isEditing ? 'Запазване...' : 'Създаване...') : (isEditing ? 'Запази промените' : 'Създай формуляр')}
            </button>
            )
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="bg-[var(--color-brand-navy)] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              Напред →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
