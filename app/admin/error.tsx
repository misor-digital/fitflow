'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-4">
          Грешка в админ панела
        </h2>
        <p className="text-gray-600 mb-6">{error.message || 'Неочаквана грешка'}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="bg-[var(--color-brand-orange)] text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Опитай отново
          </button>
          <Link href="/admin" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">
            Табло
          </Link>
        </div>
      </div>
    </div>
  );
}
