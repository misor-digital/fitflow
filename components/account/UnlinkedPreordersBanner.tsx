'use client';

import { useState, useEffect, useCallback } from 'react';

export default function UnlinkedPreordersBanner() {
  const [count, setCount] = useState(0);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/preorder/link', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hasUnlinked) setCount(data.count);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const handleLink = useCallback(async () => {
    setLinking(true);
    try {
      const res = await fetch('/api/preorder/link', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLinked(true);
        setCount(data.linked);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLinking(false);
    }
  }, []);

  if (count === 0 && !linked) return null;

  if (linked) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-green-600 text-xl">✅</span>
          <p className="text-sm font-medium text-green-800">
            {count === 1
              ? 'Предварителната поръчка беше успешно свързана с акаунта ви.'
              : `${count} предварителни поръчки бяха успешно свързани с акаунта ви.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-amber-600 text-xl">📦</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            {count === 1
              ? 'Имате 1 предварителна поръчка, която не е свързана с акаунта ви'
              : `Имате ${count} предварителни поръчки, които не са свързани с акаунта ви`}
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Свържете ги, за да ги виждате в секция &ldquo;Поръчки&rdquo; и да следите статуса им.
          </p>
          <button
            onClick={handleLink}
            disabled={linking}
            className="inline-block mt-3 px-4 py-2 bg-[var(--color-brand-navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {linking ? 'Свързване…' : 'Свържи поръчките'}
          </button>
        </div>
      </div>
    </div>
  );
}
