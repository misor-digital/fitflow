'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Step3Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Step 3 error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-[var(--color-brand-navy)] mb-4">
          Грешка при зареждане
        </h1>
        <p className="text-gray-600 mb-8">
          Възникна грешка при зареждане на стъпка 3. Моля, опитайте отново.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-[var(--color-brand-orange)] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Опитай отново
          </button>
          <Link
            href="/step-2"
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold"
          >
            Назад
          </Link>
        </div>
      </div>
    </div>
  );
}
