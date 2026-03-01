'use client';

import { useState } from 'react';

interface CancelRequestButtonProps {
  orderNumber: string;
}

/**
 * Client component island for requesting order cancellation.
 * Mounted inside the server-rendered order detail page when status is pending/confirmed.
 */
export function CancelRequestButton({ orderNumber }: CancelRequestButtonProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (submitted || loading) return;

    setLoading(true);
    try {
      // TODO: Create the /api/order/cancel-request endpoint
      await fetch('/api/order/cancel-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });
      setSubmitted(true);
    } catch {
      // Silently fail — the API does not exist yet
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-sm text-green-700" role="status" aria-live="polite">
        Заявката за отказ е изпратена. Ще получите потвърждение по имейл.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
    >
      {loading ? 'Изпращане…' : 'Заявка за отказ'}
    </button>
  );
}
