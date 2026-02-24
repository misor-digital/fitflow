'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface PromoActionsProps {
  promoId: string;
  promoCode: string;
  isEnabled: boolean;
  currentUses: number;
}

export default function PromoActions({
  promoId,
  promoCode,
  isEnabled,
  currentUses,
}: PromoActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localEnabled, setLocalEnabled] = useState(isEnabled);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const previousState = localEnabled;
    const newState = !localEnabled;

    // Optimistic update
    setLocalEnabled(newState);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/promo/${promoId}/toggle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: newState }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Грешка при промяна на статуса');
        }

        router.refresh();
      } catch (err) {
        // Revert optimistic update
        setLocalEnabled(previousState);
        setError(err instanceof Error ? err.message : 'Грешка при промяна на статуса');
      }
    });
  }

  async function handleDelete() {
    if (currentUses > 0) return;

    const confirmed = window.confirm(
      `Сигурни ли сте, че искате да изтриете промо код "${promoCode}"?`,
    );
    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/promo/${promoId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg: string = data.error || 'Грешка при изтриване';
          if (msg.includes('бил използван')) {
            alert(
              'Този промо код не може да бъде изтрит, защото е бил използван. Може да го деактивирате вместо това.',
            );
            return;
          }
          throw new Error(msg);
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Грешка при изтриване');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Toggle switch */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          localEnabled ? 'bg-green-500' : 'bg-gray-200'
        } ${isPending ? 'opacity-50' : ''}`}
        title={localEnabled ? 'Деактивирай' : 'Активирай'}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            localEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isPending || currentUses > 0}
        className={`text-xs ${
          currentUses > 0
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-red-500 hover:text-red-700'
        }`}
        title={
          currentUses > 0
            ? 'Не може да се изтрие — кодът е бил използван'
            : 'Изтрий'
        }
      >
        Изтрий
      </button>

      {/* Inline error */}
      {error && (
        <span className="text-xs text-red-500 max-w-[150px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
