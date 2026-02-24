'use client';

export default function OrderTrackError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Нещо се обърка</h1>
        <p className="text-gray-600 mb-6">
          Моля, опитайте отново или се свържете с нас.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[var(--color-brand-orange)] text-white rounded-lg hover:opacity-90"
        >
          Опитай отново
        </button>
      </div>
    </div>
  );
}
