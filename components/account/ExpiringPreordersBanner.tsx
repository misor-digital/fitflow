'use client';

import Link from 'next/link';

interface ExpiringPreordersBannerProps {
  expiringCount: number;
}

export default function ExpiringPreordersBanner({
  expiringCount,
}: ExpiringPreordersBannerProps) {
  if (expiringCount <= 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-start gap-2">
        <svg
          className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <p className="text-sm text-amber-800">
          {expiringCount === 1
            ? 'Имате 1 предварителна поръчка, която изтича скоро.'
            : `Имате ${expiringCount} предварителни поръчки, които изтичат скоро.`}
        </p>
      </div>
      <Link
        href="/account/orders?type=preorder"
        className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline whitespace-nowrap"
      >
        Преглед &rarr;
      </Link>
    </div>
  );
}
