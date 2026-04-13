'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface OrphanedSubsBannerProps {
  count: number;
  targetCycleName?: string;
  hasUpcomingCycle: boolean;
}

export function OrphanedSubsBanner({
  count,
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

        setResult(
          `${data.count} абонамент${data.count === 1 ? '' : 'а'} бяха назначени към цикъл ${data.cycleDate}.`,
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

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex flex-wrap items-center justify-between gap-3">
      <div>
        <span className="font-semibold">⚠ {count} абонамент{count === 1 ? '' : 'а'} без назначен цикъл.</span>
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
