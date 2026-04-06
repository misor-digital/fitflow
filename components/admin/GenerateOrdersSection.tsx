'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { BatchGenerationResult } from '@/lib/subscription';

interface GenerateOrdersSectionProps {
  cycleId: string;
  cycleDate: string;
  eligibleCount: number;
}

export function GenerateOrdersSection({
  cycleId,
  cycleDate,
  eligibleCount,
}: GenerateOrdersSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<BatchGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const handleGenerate = () => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/delivery/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cycleId }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Грешка при генериране на поръчки.');
          setShowConfirm(false);
          return;
        }

        const data: BatchGenerationResult = await res.json();
        setResult(data);
        setShowConfirm(false);
        router.refresh();
      } catch {
        setError('Грешка при генериране на поръчки.');
        setShowConfirm(false);
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
        🔄 Генериране на поръчки
      </h2>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className="p-4 bg-gray-50 rounded-lg border mb-4 space-y-2">
          <h3 className="font-semibold text-sm text-gray-700">Резултат от генерирането:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-green-700 font-bold text-lg">{result.generated}</p>
              <p className="text-green-600 text-xs">✅ Генерирани</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-blue-700 font-bold text-lg">{result.skipped}</p>
              <p className="text-blue-600 text-xs">⏭ Пропуснати</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-700 font-bold text-lg">{result.excluded}</p>
              <p className="text-yellow-600 text-xs">⏸ Изключени</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-700 font-bold text-lg">{result.errors}</p>
              <p className="text-red-600 text-xs">❌ Грешки</p>
            </div>
          </div>

          {result.errorDetails.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-xs text-red-600 hover:underline"
              >
                {showErrorDetails ? '▾ Скрий грешки' : '▸ Покажи грешки'}
              </button>
              {showErrorDetails && (
                <div className="mt-2 space-y-1">
                  {result.errorDetails.map((e, i) => (
                    <div key={i} className="text-xs bg-red-50 border border-red-100 rounded p-2 text-red-700">
                      <span className="font-mono">{e.subscriptionId.slice(0, 8)}…</span>: {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview + action */}
      {!result && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Ще бъдат създадени поръчки за <span className="font-bold text-[var(--color-brand-navy)]">{eligibleCount}</span> абонамента
            за цикъл <span className="font-mono">{cycleDate}</span>.
          </p>

          {eligibleCount === 0 ? (
            <p className="text-sm text-gray-400">Няма налични абонамента за този цикъл.</p>
          ) : !showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-[var(--color-brand-navy)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Генерирай поръчки за този цикъл
            </button>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-3">
                Сигурни ли сте? Ще бъдат генерирани поръчки за {eligibleCount} абонамента.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Генериране...' : 'Потвърди'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Откажи
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate again button after result */}
      {result && (
        <button
          onClick={() => {
            setResult(null);
            setShowConfirm(false);
          }}
          className="text-sm text-[var(--color-brand-navy)] hover:underline"
        >
          ← Генерирай отново
        </button>
      )}
    </div>
  );
}
