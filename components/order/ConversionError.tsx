'use client';

import Link from 'next/link';

interface ConversionErrorProps {
  message: string;
}

/**
 * Error display for invalid, expired, or already-used conversion tokens.
 */
export default function ConversionError({ message }: ConversionErrorProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{message}</h1>

        <p className="text-gray-600 mb-8">
          Ако смятате, че това е грешка, моля свържете се с нас.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/order"
            className="inline-flex items-center justify-center px-6 py-3 bg-[var(--color-brand-orange)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Направи нова поръчка
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Начална страница
          </Link>
        </div>
      </div>
    </div>
  );
}
