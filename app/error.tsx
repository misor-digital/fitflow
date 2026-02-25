'use client';

import { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
    // TODO: Send to error monitoring service (Sentry, etc.)
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-[var(--color-brand-navy)] mb-4">
          Нещо се обърка
        </h1>
        <p className="text-gray-600 mb-8">
          Възникна неочаквана грешка. Моля, опитайте отново.
        </p>
        <button
          onClick={reset}
          className="bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Опитай отново
        </button>
      </div>
    </div>
  );
}
