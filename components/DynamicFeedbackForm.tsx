'use client';

import { useState, useTransition, useCallback } from 'react';
import type { FeedbackFormSchema, FeedbackFormSettings } from '@/lib/supabase/types';

const RATING_LABELS: Record<number, string> = {
  1: 'Слабо',
  2: 'ОК',
  3: 'Добре',
  4: 'Много добре',
  5: 'Отлично',
};

/** Fields that should span both columns in the 2-col grid */
const WIDE_FIELD_TYPES = new Set(['textarea', 'nps', 'multi_select']);

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
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>({});
  const [poppedStar, setPoppedStar] = useState<string | null>(null);

  const updateAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  function handleStarClick(fieldId: string, val: number) {
    updateAnswer(fieldId, val);
    // Trigger bounce animation
    const key = `${fieldId}-${val}`;
    setPoppedStar(key);
    setTimeout(() => setPoppedStar(null), 250);
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
      <div className="text-center py-16">
        <div className="text-5xl mb-4 animate-success-pop">✅</div>
        <p className="text-lg font-semibold text-[var(--color-brand-navy)] animate-fade-in-up">
          {settings.thankYouMessage || 'Благодарим за обратната връзка!'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 mb-5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Responsive 2-column grid for field cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {schema.fields.map(field => {
          const isWide = WIDE_FIELD_TYPES.has(field.type);

          return (
            <div
              key={field.id}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-shadow hover:shadow-md ${
                isWide ? 'md:col-span-2' : ''
              }`}
            >
              {/* Product image - consistent sizing */}
              {field.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={field.image_url}
                  alt={field.label}
                  className="h-28 w-full object-contain rounded-lg border border-gray-200 mb-3"
                />
              )}

              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {/* Rating */}
              {field.type === 'rating' && (() => {
                const max = (field.options?.max as number) || 5;
                const selectedVal = answers[field.id] as number | undefined;
                const hoverVal = hoveredRating[field.id];
                const displayVal = hoverVal ?? selectedVal;

                return (
                  <div>
                    <div
                      className="flex gap-1"
                      onMouseLeave={() => setHoveredRating(prev => {
                        const next = { ...prev };
                        delete next[field.id];
                        return next;
                      })}
                    >
                      {Array.from({ length: max }, (_, i) => {
                        const val = i + 1;
                        const highlighted = displayVal !== undefined && displayVal >= val;
                        const starKey = `${field.id}-${val}`;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleStarClick(field.id, val)}
                            onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [field.id]: val }))}
                            className={`text-3xl min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-125 ${
                              highlighted ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                            } ${poppedStar === starKey ? 'animate-star-pop' : ''}`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                    {/* Rating label feedback */}
                    {selectedVal !== undefined && (
                      <p className="text-sm text-gray-500 mt-1 animate-fade-in-up" key={selectedVal}>
                        {RATING_LABELS[selectedVal] ?? `${selectedVal} / ${max}`}
                      </p>
                    )}
                  </div>
                );
              })()}

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
                          className={`w-10 h-10 sm:w-9 sm:h-9 text-sm border rounded-lg font-medium transition-colors ${
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
                <div className="space-y-1">
                  {field.choices?.map(choice => {
                    const selected = ((answers[field.id] as string[]) ?? []).includes(choice);
                    return (
                      <label key={choice} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
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
                          className="rounded w-5 h-5"
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
                        className={`px-6 py-3 border rounded-lg text-sm font-medium transition-colors ${
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
          );
        })}
      </div>

      {/* Sticky submit on mobile, normal flow on desktop */}
      <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur-sm border-t border-gray-100 -mx-4 px-4 py-3 mt-6 md:static md:bg-transparent md:backdrop-blur-none md:border-t-0 md:mx-0 md:px-0 md:py-0 md:mt-6">
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[var(--color-brand-orange)] text-white py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isPending ? 'Изпращане...' : 'Изпрати'}
        </button>
      </div>
    </form>
  );
}
