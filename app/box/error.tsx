'use client';

export default function BoxError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold text-[var(--color-brand-navy)]">
        Нещо се обърка
      </h2>
      <p className="text-gray-600">
        Не можахме да заредим страницата. Моля, опитайте отново.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-[var(--color-brand-orange)] px-6 py-2 font-semibold text-white hover:opacity-90"
      >
        Опитай отново
      </button>
    </div>
  );
}
