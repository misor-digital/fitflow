'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface OrphanedSubsBannerProps {
  subCount: number;
  orderCount: number;
  targetCycleName?: string;
  hasUpcomingCycle: boolean;
}

export function OrphanedSubsBanner({
  subCount,
  orderCount,
  targetCycleName,
  hasUpcomingCycle,
}: OrphanedSubsBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBackfill() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/delivery/backfill-orphans', {
          method: 'POST',
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Грешка при назначаване.');
          return;
        }

        const parts: string[] = [];
        if (data.subscriptions > 0) {
          parts.push(`${data.subscriptions} абонамент${data.subscriptions === 1 ? '' : 'а'}`);
        }
        if (data.orders > 0) {
          parts.push(`${data.orders} поръчк${data.orders === 1 ? 'а' : 'и'}`);
        }
        setResult(
          `${parts.join(' и ')} бяха назначени към цикъл ${data.cycleDate}.`,
        );
        router.refresh();
      } catch {
        setError('Грешка при назначаване.');
      }
    });
  }

  if (result) {
    return (
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        ✓ {result}
      </div>
    );
  }

  const parts: string[] = [];
  if (subCount > 0) {
    parts.push(`${subCount} абонамент${subCount === 1 ? '' : 'а'}`);
  }
  if (orderCount > 0) {
    parts.push(`${orderCount} поръчк${orderCount === 1 ? 'а' : 'и'}`);
  }

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex flex-wrap items-center justify-between gap-3">
      <div>
        <span className="font-semibold">⚠ {parts.join(' и ')} без назначен цикъл.</span>
        {targetCycleName && (
          <span className="ml-1 text-amber-600">
            Ще бъдат назначени към: <strong>{targetCycleName}</strong>
          </span>
        )}
      </div>

      {error && (
        <span className="w-full text-red-600 text-xs">{error}</span>
      )}

      <button
        onClick={handleBackfill}
        disabled={isPending || !hasUpcomingCycle}
        title={!hasUpcomingCycle ? 'Създайте нов цикъл първо' : undefined}
        className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Назначаване...' : 'Назначи'}
      </button>
    </div>
  );
}
