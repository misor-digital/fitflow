'use client';

import { useState, useTransition } from 'react';
import type { FeedbackFormSchema, FeedbackFormSettings } from '@/lib/supabase/types';

interface Props {
  slug: string;
  schema: FeedbackFormSchema;
  settings: FeedbackFormSettings;
  accessToken?: string | null;
}

export default function DynamicFeedbackForm({ slug, schema, settings, accessToken }: Props) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  function updateAnswer(fieldId: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/feedback/${encodeURIComponent(slug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, token: accessToken ?? undefined }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? 'Възникна грешка.');
          return;
        }

        setSubmitted(true);
      } catch {
        setError('Неочаквана грешка. Моля, опитайте отново.');
      }
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✅</div>
        <p className="text-lg font-semibold text-[var(--color-brand-navy)]">
          {settings.thankYouMessage || 'Благодарим за обратната връзка!'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {schema.fields.map(field => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
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

          {/* Rating */}
          {field.type === 'rating' && (
            <div className="flex gap-1">
              {Array.from({ length: (field.options?.max as number) || 5 }, (_, i) => {
                const val = i + 1;
                const selected = (answers[field.id] as number) >= val;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => updateAnswer(field.id, val)}
                    className={`text-2xl transition-colors ${
                      selected ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    ★
                  </button>
                );
              })}
              {answers[field.id] !== undefined && (
                <span className="text-sm text-gray-500 ml-2 self-center">
                  {answers[field.id] as number} / {(field.options?.max as number) || 5}
                </span>
              )}
            </div>
          )}

          {/* NPS */}
          {field.type === 'nps' && (
            <div>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 11 }, (_, i) => {
                  const selected = answers[field.id] === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => updateAnswer(field.id, i)}
                      className={`w-9 h-9 text-sm border rounded-lg font-medium transition-colors ${
                        selected
                          ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                          : 'border-gray-300 text-gray-700 hover:border-[var(--color-brand-orange)] hover:bg-orange-50'
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>Малко вероятно</span>
                <span>Много вероятно</span>
              </div>
            </div>
          )}

          {/* Text */}
          {field.type === 'text' && (
            <input
              type="text"
              value={(answers[field.id] as string) ?? ''}
              onChange={e => updateAnswer(field.id, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
              maxLength={(field.options?.maxLength as number) || 500}
            />
          )}

          {/* Textarea */}
          {field.type === 'textarea' && (
            <textarea
              value={(answers[field.id] as string) ?? ''}
              onChange={e => updateAnswer(field.id, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
              rows={4}
              maxLength={(field.options?.maxLength as number) || 2000}
            />
          )}

          {/* Select */}
          {field.type === 'select' && (
            <select
              value={(answers[field.id] as string) ?? ''}
              onChange={e => updateAnswer(field.id, e.target.value || undefined)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:border-transparent"
            >
              <option value="">Изберете...</option>
              {field.choices?.map(choice => (
                <option key={choice} value={choice}>{choice}</option>
              ))}
            </select>
          )}

          {/* Multi Select */}
          {field.type === 'multi_select' && (
            <div className="space-y-2">
              {field.choices?.map(choice => {
                const selected = ((answers[field.id] as string[]) ?? []).includes(choice);
                return (
                  <label key={choice} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={e => {
                        const current = (answers[field.id] as string[]) ?? [];
                        updateAnswer(
                          field.id,
                          e.target.checked
                            ? [...current, choice]
                            : current.filter(c => c !== choice),
                        );
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{choice}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Boolean */}
          {field.type === 'boolean' && (
            <div className="flex gap-3">
              {[
                { value: true, label: 'Да' },
                { value: false, label: 'Не' },
              ].map(opt => {
                const selected = answers[field.id] === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => updateAnswer(field.id, opt.value)}
                    className={`px-5 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-[var(--color-brand-orange)] text-white border-[var(--color-brand-orange)]'
                        : 'border-gray-300 text-gray-700 hover:border-[var(--color-brand-orange)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <hr className="border-gray-200" />

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[var(--color-brand-orange)] text-white py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isPending ? 'Изпращане...' : 'Изпрати'}
      </button>
    </form>
  );
}
