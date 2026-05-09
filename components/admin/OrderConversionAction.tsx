'use client';

import { useState } from 'react';
import type { OrderRow } from '@/lib/supabase/types';

interface OrderConversionActionProps {
  order: OrderRow;
  onSuccess: () => void;
}

/** One-time order types eligible for conversion */
const CONVERTIBLE_ORDER_TYPES = new Set([
  'onetime-mystery',
  'onetime-revealed',
  'direct',
]);

export default function OrderConversionAction({
  order,
  onSuccess,
}: OrderConversionActionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Determine current state
  const isConverted =
    order.subscription_conversion_status === 'converted' ||
    order.converted_to_subscription_id != null;

  const hasPendingToken =
    order.subscription_conversion_status === 'pending' &&
    order.subscription_conversion_token != null;

  // Only show for eligible order types
  if (!CONVERTIBLE_ORDER_TYPES.has(order.order_type)) return null;
  // Don't show for subscription-generated orders
  if (order.subscription_id) return null;

  function buildConversionUrl(token: string) {
    return `${window.location.origin}/subscription/convert?token=${token}`;
  }

  function copyToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Копирайте линка:', text);
    }
    document.body.removeChild(textarea);
  }

  async function generateAndCopy() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/order/${order.id}/conversion-token`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Грешка при генериране на линк.');
      }

      const token = data.token as string;
      setGeneratedToken(token);
      copyToClipboard(buildConversionUrl(token));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неочаквана грешка.');
    } finally {
      setLoading(false);
    }
  }

  const activeToken = generatedToken ?? order.subscription_conversion_token;

  return (
    <div className="mt-3">
      <h4 className="font-semibold text-[var(--color-brand-navy)] text-xs mb-1">
        Конвертиране в абонамент
      </h4>

      {isConverted ? (
        <p className="text-xs text-green-600 font-medium">
          ✓ Конвертирана в абонамент
        </p>
      ) : hasPendingToken || generatedToken ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600 font-medium">Чака конвертиране</span>
          <button
            onClick={() => copyToClipboard(buildConversionUrl(activeToken!))}
            className="text-xs text-[var(--color-brand-orange)] hover:underline"
            title="Копирай линк за конвертиране"
          >
            {copied ? '✓ Копирано!' : '📋 Копирай линк'}
          </button>
        </div>
      ) : order.status === 'delivered' ? (
        <button
          onClick={generateAndCopy}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-[var(--color-brand-navy)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Генериране...' : '🔀 Генерирай линк'}
        </button>
      ) : (
        <p className="text-xs text-gray-400 italic">
          Поръчката трябва да е доставена
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
