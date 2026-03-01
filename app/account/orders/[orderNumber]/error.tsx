'use client';

import Link from 'next/link';

export default function OrderDetailError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold text-[var(--color-brand-navy)]">
        Грешка при зареждане
      </h2>
      <p className="text-gray-600">
        Не можахме да заредим детайлите на поръчката. Моля, опитайте отново.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-[var(--color-brand-orange)] px-6 py-2 font-semibold text-white hover:opacity-90"
        >
          Опитай отново
        </button>
        <Link
          href="/account/orders"
          className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Назад към поръчки
        </Link>
      </div>
    </div>
  );
}
