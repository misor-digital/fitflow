'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Banner shown to authenticated users who have unlinked preorders.
 * Placed on the account page and thank-you page.
 */
export default function PreorderLinkBanner() {
  const { user } = useAuthStore();
  const [unlinkedCount, setUnlinkedCount] = useState(0);
  const [linking, setLinking] = useState(false);
  const [linkedResult, setLinkedResult] = useState<{ linked: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function checkUnlinked() {
      try {
        const res = await fetch('/api/preorder/link', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setUnlinkedCount(data.count);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Silently fail — this is a non-critical enhancement
      }
    }

    checkUnlinked();
    return () => controller.abort();
  }, [user]);

  async function handleLink() {
    setLinking(true);
    try {
      const res = await fetch('/api/preorder/link', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLinkedResult(data);
        setUnlinkedCount(0);
      }
    } catch {
      // Show error via state if needed
    }
    setLinking(false);
  }

  if (dismissed || (!unlinkedCount && !linkedResult)) return null;

  if (linkedResult) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-green-800 font-medium">
          ✓ {linkedResult.linked} поръчк{linkedResult.linked === 1 ? 'а беше свързана' : 'и бяха свързани'} с акаунта ви.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-green-600 mt-2 hover:underline"
        >
          Затвори
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <p className="text-blue-800 font-medium">
        Имате {unlinkedCount} предишн{unlinkedCount === 1 ? 'а поръчка' : 'и поръчки'} с този имейл.
      </p>
      <p className="text-sm text-blue-600 mt-1">
        Желаете ли да ги свържете с акаунта си?
      </p>
      <div className="flex gap-3 mt-3">
        <button
          onClick={handleLink}
          disabled={linking}
          className="bg-[var(--color-brand-navy)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-brand-orange)] transition-colors disabled:opacity-50"
        >
          {linking ? 'Свързване...' : 'Свържи поръчките'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-gray-500 hover:underline"
        >
          По-късно
        </button>
      </div>
    </div>
  );
}
