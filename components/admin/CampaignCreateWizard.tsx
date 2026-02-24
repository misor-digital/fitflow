'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailCampaignTypeEnum } from '@/lib/supabase/types';

type WizardStep = 'type' | 'details' | 'ab-test' | 'audience' | 'review';

interface ABVariantForm {
  variantLabel: string;
  subject: string;
  templateId: string;
  recipientPercentage: number;
}

interface CampaignFormData {
  type: EmailCampaignTypeEnum | '';
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  templateId: string;
  params: string; // JSON string
  filter: Record<string, unknown>;
  abEnabled: boolean;
  abVariants: ABVariantForm[];
  abWinnerMetric: 'open_rate' | 'click_rate';
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'type', label: 'Тип кампания' },
  { key: 'details', label: 'Детайли' },
  { key: 'ab-test', label: 'A/B Тест' },
  { key: 'audience', label: 'Аудитория' },
  { key: 'review', label: 'Преглед' },
];

const TYPE_CARDS: {
  value: EmailCampaignTypeEnum;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'preorder-conversion',
    label: 'Преобразуване на предпоръчки',
    icon: '🔄',
    description: 'Изпратете имейл на клиенти с предварителни поръчки да завършат покупката',
  },
  {
    value: 'lifecycle',
    label: 'Абонаментна кампания',
    icon: '🔁',
    description: 'Изпратете имейл на активни или неактивни абонати',
  },
  {
    value: 'promotional',
    label: 'Промоционална',
    icon: '📣',
    description: 'Изпратете промоционален имейл на всички клиенти',
  },
  {
    value: 'one-off',
    label: 'Известие',
    icon: '📨',
    description: 'Изпратете информационен имейл на избрана аудитория',
  },
];

const BOX_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Всички типове кутии' },
  { value: 'mixed', label: 'Смесена' },
  { value: 'vegan', label: 'Веган' },
  { value: 'fitness', label: 'Фитнес' },
  { value: 'keto', label: 'Кето' },
];

const SUB_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  { value: 'active', label: 'Активни' },
  { value: 'paused', label: 'На пауза' },
  { value: 'cancelled', label: 'Отказани' },
];

export default function CampaignCreateWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<CampaignFormData>({
    type: '',
    name: '',
    subject: '',
    fromName: 'FitFlow',
    fromEmail: '',
    templateId: '',
    params: '{}',
    filter: {},
    abEnabled: false,
    abVariants: [
      { variantLabel: 'A', subject: '', templateId: '', recipientPercentage: 50 },
      { variantLabel: 'B', subject: '', templateId: '', recipientPercentage: 50 },
    ],
    abWinnerMetric: 'open_rate',
  });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------
  function canProceed(): boolean {
    switch (step) {
      case 'type':
        return formData.type !== '';
      case 'details':
        return formData.name.trim() !== '' && formData.subject.trim() !== '';
      case 'ab-test':
        return true; // Optional step — always valid
      case 'audience':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    if (!canProceed()) return;
    const next = STEPS[currentStepIndex + 1];
    if (next) setStep(next.key);
  }

  function goBack() {
    const prev = STEPS[currentStepIndex - 1];
    if (prev) setStep(prev.key);
  }

  // ------------------------------------------------------------------
  // Preview audience count
  // ------------------------------------------------------------------
  async function fetchPreview() {
    setIsLoadingPreview(true);
    setPreviewCount(null);
    try {
      const qs = new URLSearchParams();
      qs.set('type', formData.type);
      if (formData.filter.boxType) qs.set('boxType', String(formData.filter.boxType));
      if (formData.filter.subscriptionStatus) qs.set('subscriptionStatus', String(formData.filter.subscriptionStatus));

      const res = await fetch(`/api/admin/campaigns?limit=1&type=${formData.type}`);
      // We'll estimate from the total count; a dedicated preview endpoint would be ideal.
      // For now, we signal UI readiness by showing total if available.
      if (res.ok) {
        const json = await res.json();
        setPreviewCount(json.total ?? 0);
      }
    } catch {
      // Silently handle — preview is non-critical
    } finally {
      setIsLoadingPreview(false);
    }
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  async function handleSubmit() {
    setError(null);

    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = JSON.parse(formData.params);
    } catch {
      setError('Невалиден JSON за параметри.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            type: formData.type,
            subject: formData.subject.trim(),
            templateId: formData.templateId ? Number(formData.templateId) : null,
            fromName: formData.fromName.trim() || undefined,
            fromEmail: formData.fromEmail.trim() || undefined,
            filter: formData.filter,
            params: parsedParams,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error ?? `Грешка при създаване (${res.status}).`);
          return;
        }

        const { data } = await res.json();

        // Create A/B test if enabled
        if (formData.abEnabled) {
          const abVariants = formData.abVariants.map((v) => ({
            variantLabel: v.variantLabel,
            subject: v.subject || undefined,
            templateId: v.templateId ? Number(v.templateId) : undefined,
            recipientPercentage: v.recipientPercentage,
          }));

          await fetch(`/api/admin/campaigns/${data.id}/ab-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: abVariants }),
          });
        }

        router.push(`/admin/campaigns/${data.id}`);
      } catch {
        setError('Мрежова грешка. Опитайте отново.');
      }
    });
  }

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------
  function updateFilter(key: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      filter: { ...prev.filter, [key]: value || undefined },
    }));
    setPreviewCount(null);
  }

  const typeLabel = TYPE_CARDS.find((c) => c.value === formData.type)?.label ?? '';

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                i < currentStepIndex
                  ? 'bg-green-500 text-white'
                  : i === currentStepIndex
                    ? 'bg-[var(--color-brand-navy)] text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < currentStepIndex ? '✓' : i + 1}
            </div>
            <span
              className={`hidden sm:inline text-sm ${
                i === currentStepIndex ? 'font-semibold text-[var(--color-brand-navy)]' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Type */}
      {step === 'type' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-navy)] mb-4">
            Изберете тип кампания
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TYPE_CARDS.map((card) => (
              <button
                key={card.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: card.value }))}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  formData.type === card.value
                    ? 'border-[var(--color-brand-orange)] bg-orange-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="font-semibold text-[var(--color-brand-navy)]">{card.label}</span>
                </div>
                <p className="text-sm text-gray-500">{card.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 'details' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-navy)] mb-4">
            Детайли на кампанията
          </h2>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Име на кампанията <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="напр. Февруари 2026 — преобразуване предпоръчки"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тема на имейла <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="напр. Вашата FitFlow кутия ви очаква!"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Име на подателя
                </label>
                <input
                  type="text"
                  value={formData.fromName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fromName: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="FitFlow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имейл на подателя
                </label>
                <input
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fromEmail: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="по подразбиране от настройки"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brevo шаблон ID
              </label>
              <input
                type="number"
                value={formData.templateId}
                onChange={(e) => setFormData((prev) => ({ ...prev, templateId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="напр. 12"
              />
              {formData.type === 'preorder-conversion' && !formData.templateId && (
                <p className="text-xs text-amber-600 mt-1">
                  Ще се използва шаблонът по подразбиране за преобразуване на предпоръчки.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Параметри (JSON)
              </label>
              <textarea
                value={formData.params}
                onChange={(e) => setFormData((prev) => ({ ...prev, params: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                rows={3}
                placeholder='{ "discount": "10%", "deadline": "2026-03-01" }'
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: A/B Test (optional) */}
      {step === 'ab-test' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-navy)] mb-4">
            A/B Тест
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            По избор: тествайте различни теми или шаблони, за да разберете кое работи по-добре.
          </p>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.abEnabled}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, abEnabled: e.target.checked }))
              }
              className="h-5 w-5 accent-[var(--color-brand-orange)] rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Активирай A/B тест
            </span>
          </label>

          {formData.abEnabled && (
            <div className="space-y-6 max-w-xl">
              {formData.abVariants.map((variant, idx) => (
                <div key={variant.variantLabel} className="bg-white rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold text-[var(--color-brand-navy)]">
                    Вариант {variant.variantLabel}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тема на имейла (замества кампанията)
                    </label>
                    <input
                      type="text"
                      value={variant.subject}
                      onChange={(e) => {
                        const updated = [...formData.abVariants];
                        updated[idx] = { ...updated[idx], subject: e.target.value };
                        setFormData((prev) => ({ ...prev, abVariants: updated }));
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder={`Тема за вариант ${variant.variantLabel}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brevo шаблон ID (замества кампанията)
                    </label>
                    <input
                      type="number"
                      value={variant.templateId}
                      onChange={(e) => {
                        const updated = [...formData.abVariants];
                        updated[idx] = { ...updated[idx], templateId: e.target.value };
                        setFormData((prev) => ({ ...prev, abVariants: updated }));
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="напр. 12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Процент получатели: {variant.recipientPercentage}%
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={variant.recipientPercentage}
                      onChange={(e) => {
                        const newVal = Number(e.target.value);
                        const updated = [...formData.abVariants];
                        updated[idx] = { ...updated[idx], recipientPercentage: newVal };
                        // Auto-adjust the other variant to sum to 100
                        const otherIdx = idx === 0 ? 1 : 0;
                        updated[otherIdx] = {
                          ...updated[otherIdx],
                          recipientPercentage: 100 - newVal,
                        };
                        setFormData((prev) => ({ ...prev, abVariants: updated }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Критерий за победител
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="abMetric"
                      checked={formData.abWinnerMetric === 'open_rate'}
                      onChange={() =>
                        setFormData((prev) => ({ ...prev, abWinnerMetric: 'open_rate' }))
                      }
                      className="accent-[var(--color-brand-orange)]"
                    />
                    <span className="text-sm">Процент отваряне</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="abMetric"
                      checked={formData.abWinnerMetric === 'click_rate'}
                      onChange={() =>
                        setFormData((prev) => ({ ...prev, abWinnerMetric: 'click_rate' }))
                      }
                      className="accent-[var(--color-brand-orange)]"
                    />
                    <span className="text-sm">Процент кликване</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <span>ℹ️</span>
                <span>
                  Получателите ще бъдат разделени на {formData.abVariants[0].recipientPercentage}% / {formData.abVariants[1].recipientPercentage}%.
                  Победителят ще бъде определен след изпращане при минимум 50 доставени на вариант.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Audience */}
      {step === 'audience' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-navy)] mb-4">
            Аудитория
          </h2>

          {formData.type === 'preorder-conversion' && (
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-gray-600">
                Ще бъдат включени клиенти с предварителни поръчки, които все още не са завършили покупката.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Филтър по тип кутия
                </label>
                <select
                  value={(formData.filter.boxType as string) ?? ''}
                  onChange={(e) => updateFilter('boxType', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white w-full"
                >
                  {BOX_TYPE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {formData.type === 'lifecycle' && (
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-gray-600">
                Ще бъдат включени абонати според избрания статус и тип кутия.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Статус на абонамента
                </label>
                <select
                  value={(formData.filter.subscriptionStatus as string) ?? ''}
                  onChange={(e) => updateFilter('subscriptionStatus', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white w-full"
                >
                  {SUB_STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Филтър по тип кутия
                </label>
                <select
                  value={(formData.filter.boxType as string) ?? ''}
                  onChange={(e) => updateFilter('boxType', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white w-full"
                >
                  {BOX_TYPE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {formData.type === 'promotional' && (
            <div className="max-w-md">
              <p className="text-sm text-gray-600">
                Ще бъдат включени всички клиенти в системата.
              </p>
            </div>
          )}

          {formData.type === 'one-off' && (
            <div className="max-w-md">
              <p className="text-sm text-gray-600">
                Ще бъдат включени всички клиенти. За прецизна публика, използвайте филтрите при редактиране.
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="mt-6">
            <button
              type="button"
              onClick={fetchPreview}
              disabled={isLoadingPreview}
              className="border border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-brand-navy)] hover:text-white transition-colors disabled:opacity-50"
            >
              {isLoadingPreview ? 'Зареждане...' : 'Визуализация'}
            </button>
            {previewCount !== null && (
              <span className="ml-3 text-sm text-gray-600">
                Приблизителен брой получатели: <strong>{previewCount}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 'review' && (
        <div>
          <h2 className="text-xl font-bold text-[var(--color-brand-navy)] mb-4">
            Преглед на кампанията
          </h2>
          <div className="bg-white rounded-xl border p-6 space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Тип</p>
                <p className="font-medium">{typeLabel}</p>
              </div>
              <div>
                <p className="text-gray-500">Име</p>
                <p className="font-medium">{formData.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Тема</p>
                <p className="font-medium">{formData.subject}</p>
              </div>
              <div>
                <p className="text-gray-500">Подател</p>
                <p className="font-medium">
                  {formData.fromName || 'FitFlow'}{' '}
                  {formData.fromEmail && <span className="text-gray-400">({formData.fromEmail})</span>}
                </p>
              </div>
              {formData.templateId && (
                <div>
                  <p className="text-gray-500">Brevo шаблон</p>
                  <p className="font-medium">#{formData.templateId}</p>
                </div>
              )}
              {formData.abEnabled && (
                <div className="col-span-2">
                  <p className="text-gray-500">A/B Тест</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.abVariants.map((v) => (
                      <span key={v.variantLabel} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                        {v.variantLabel}: {v.subject || 'Тема по подразбиране'} ({v.recipientPercentage}%)
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Критерий: {formData.abWinnerMetric === 'open_rate' ? 'Процент отваряне' : 'Процент кликване'}
                  </p>
                </div>
              )}
              {Object.keys(formData.filter).filter((k) => formData.filter[k]).length > 0 && (
                <div className="col-span-2">
                  <p className="text-gray-500">Филтри</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(formData.filter)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <span key={k} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {k}: {String(v)}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <div>
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Назад
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step !== 'review' ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="bg-[var(--color-brand-navy)] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Напред →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-[var(--color-brand-orange)] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Създаване...' : 'Създай кампания'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
