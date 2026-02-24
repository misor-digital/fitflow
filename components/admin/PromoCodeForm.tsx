'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PromoCodeFormProps {
  initialData?: {
    id: string;
    code: string;
    discount_percent: number;
    description: string | null;
    is_enabled: boolean;
    starts_at: string | null;
    ends_at: string | null;
    max_uses: number | null;
    max_uses_per_user: number | null;
  };
}

interface PromoFormState {
  code: string;
  discountPercent: string;
  description: string;
  isEnabled: boolean;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  maxUsesPerUser: string;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)]';

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1';

const HELPER_CLASS = 'mt-1 text-xs text-gray-400';

export default function PromoCodeForm({ initialData }: PromoCodeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = Boolean(initialData);

  const [formState, setFormState] = useState<PromoFormState>({
    code: initialData?.code ?? '',
    discountPercent: initialData ? String(initialData.discount_percent) : '',
    description: initialData?.description ?? '',
    isEnabled: initialData?.is_enabled ?? true,
    startsAt: toDatetimeLocal(initialData?.starts_at ?? null),
    endsAt: toDatetimeLocal(initialData?.ends_at ?? null),
    maxUses:
      initialData?.max_uses != null ? String(initialData.max_uses) : '',
    maxUsesPerUser:
      initialData?.max_uses_per_user != null
        ? String(initialData.max_uses_per_user)
        : '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update<K extends keyof PromoFormState>(
    key: K,
    value: PromoFormState[K],
  ) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string[] {
    const errors: string[] = [];
    const code = formState.code.trim();

    if (!code) errors.push('Кодът е задължителен.');
    else if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
      errors.push(
        'Кодът трябва да е 2-30 символа (букви, цифри, тире, долна черта).',
      );
    }

    const dp = parseFloat(formState.discountPercent);
    if (isNaN(dp) || dp <= 0 || dp > 100) {
      errors.push('Отстъпката трябва да е между 0.01% и 100%.');
    }

    if (formState.startsAt && formState.endsAt) {
      if (new Date(formState.endsAt) <= new Date(formState.startsAt)) {
        errors.push('Крайната дата трябва да е след началната.');
      }
    }

    if (
      formState.maxUses &&
      (!Number.isInteger(Number(formState.maxUses)) ||
        Number(formState.maxUses) < 1)
    ) {
      errors.push(
        'Максималните използвания трябва да е положително цяло число.',
      );
    }

    if (
      formState.maxUsesPerUser &&
      (!Number.isInteger(Number(formState.maxUsesPerUser)) ||
        Number(formState.maxUsesPerUser) < 1)
    ) {
      errors.push(
        'Максималните използвания на потребител трябва да е положително цяло число.',
      );
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      return;
    }

    const payload = {
      code: formState.code.trim().toUpperCase(),
      discount_percent: parseFloat(formState.discountPercent),
      description: formState.description.trim() || null,
      is_enabled: formState.isEnabled,
      starts_at: formState.startsAt
        ? new Date(formState.startsAt).toISOString()
        : null,
      ends_at: formState.endsAt
        ? new Date(formState.endsAt).toISOString()
        : null,
      max_uses: formState.maxUses ? parseInt(formState.maxUses, 10) : null,
      max_uses_per_user: formState.maxUsesPerUser
        ? parseInt(formState.maxUsesPerUser, 10)
        : null,
    };

    startTransition(async () => {
      try {
        const url = isEditMode
          ? `/api/admin/promo/${initialData!.id}`
          : '/api/admin/promo';
        const method = isEditMode ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Възникна грешка.');
          return;
        }

        if (isEditMode) {
          setSuccess('Промо кодът е обновен успешно.');
          router.refresh();
        } else {
          router.push('/admin/promo');
          router.refresh();
        }
      } catch {
        setError('Възникна грешка при свързване със сървъра.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Code + Discount */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label htmlFor="promo-code" className={LABEL_CLASS}>
            Промо код
          </label>
          <input
            id="promo-code"
            type="text"
            value={formState.code}
            onChange={(e) => update('code', e.target.value.toUpperCase())}
            placeholder="напр. ЛЯТО2026"
            maxLength={30}
            className={INPUT_CLASS}
          />
          {isEditMode && (
            <p className="mt-1 text-xs text-amber-600">
              Промяната на кода ще засегне съществуващи линкове и споделяния.
            </p>
          )}
          <p className={HELPER_CLASS}>
            2–30 символа: букви, цифри, тире, долна черта
          </p>
        </div>

        <div>
          <label htmlFor="promo-discount" className={LABEL_CLASS}>
            Отстъпка (%)
          </label>
          <input
            id="promo-discount"
            type="number"
            value={formState.discountPercent}
            onChange={(e) => update('discountPercent', e.target.value)}
            placeholder="напр. 15"
            step="0.01"
            min="0.01"
            max="100"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Row 2: Description */}
      <div>
        <label htmlFor="promo-description" className={LABEL_CLASS}>
          Описание (вътрешно)
        </label>
        <textarea
          id="promo-description"
          value={formState.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="За вътрешно ползване — няма да се показва на клиенти"
          maxLength={500}
          rows={3}
          className={INPUT_CLASS}
        />
        <p className={HELPER_CLASS}>
          {formState.description.length}/500 символа
        </p>
      </div>

      {/* Row 3: Enabled toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formState.isEnabled}
              onChange={(e) => update('isEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-green-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {formState.isEnabled ? 'Активен' : 'Неактивен'}
          </span>
        </label>
      </div>

      {/* Row 4: Date range */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label htmlFor="promo-starts-at" className={LABEL_CLASS}>
            Начална дата
          </label>
          <input
            id="promo-starts-at"
            type="datetime-local"
            value={formState.startsAt}
            onChange={(e) => update('startsAt', e.target.value)}
            className={INPUT_CLASS}
          />
          <p className={HELPER_CLASS}>
            Ако е зададена, кодът важи от тази дата
          </p>
        </div>

        <div>
          <label htmlFor="promo-ends-at" className={LABEL_CLASS}>
            Крайна дата
          </label>
          <input
            id="promo-ends-at"
            type="datetime-local"
            value={formState.endsAt}
            onChange={(e) => update('endsAt', e.target.value)}
            className={INPUT_CLASS}
          />
          <p className={HELPER_CLASS}>
            Ако е зададена, кодът изтича след тази дата
          </p>
        </div>
      </div>

      {/* Row 5: Usage limits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label htmlFor="promo-max-uses" className={LABEL_CLASS}>
            Макс. използвания (общо)
          </label>
          <input
            id="promo-max-uses"
            type="number"
            value={formState.maxUses}
            onChange={(e) => update('maxUses', e.target.value)}
            placeholder="Без ограничение"
            min="1"
            step="1"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="promo-max-uses-per-user" className={LABEL_CLASS}>
            Макс. използвания на потребител
          </label>
          <input
            id="promo-max-uses-per-user"
            type="number"
            value={formState.maxUsesPerUser}
            onChange={(e) => update('maxUsesPerUser', e.target.value)}
            placeholder="Без ограничение"
            min="1"
            step="1"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* Success message (edit mode) */}
      {success && (
        <div className="p-3 text-sm text-green-700 bg-green-50 rounded-lg">
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Link
          href="/admin/promo"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Отказ
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-sm font-medium text-white bg-[var(--color-brand-orange)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending
            ? 'Запазване...'
            : isEditMode
              ? 'Запази промените'
              : 'Създай промо код'}
        </button>
      </div>
    </form>
  );
}
