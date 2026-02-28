'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PasswordSetupBanner() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/auth/has-password', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setHasPassword(data.hasPassword);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  if (hasPassword !== false) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-amber-600 text-xl">🔑</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            Акаунтът ви няма зададена парола
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Задайте парола, за да можете да влизате и с имейл и парола, не само с магически линк.
          </p>
          <Link
            href="/setup-password"
            className="inline-block mt-3 px-4 py-2 bg-[var(--color-brand-navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-brand-orange)] transition-colors"
          >
            Задайте парола
          </Link>
        </div>
      </div>
    </div>
  );
}
