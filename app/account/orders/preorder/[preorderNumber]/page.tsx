import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import {
  getPreorderByOrderId,
  getOrderById,
  getBoxTypeNames,
  getEurToBgnRate,
} from '@/lib/data';
import {
  PREORDER_STATUS_LABELS,
  PREORDER_STATUS_COLORS,
} from '@/lib/order';
import { formatPriceDual } from '@/lib/catalog';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Предварителна поръчка | FitFlow',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateBG(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PreorderDetailPage({
  params,
}: {
  params: Promise<{ preorderNumber: string }>;
}) {
  const { preorderNumber } = await params;
  const { userId } = await requireAuth();

  const preorder = await getPreorderByOrderId(decodeURIComponent(preorderNumber));

  // Not found or not owned by this user → 404
  if (!preorder || preorder.user_id !== userId) {
    notFound();
  }

  const [boxTypeNames, eurToBgnRate] = await Promise.all([
    getBoxTypeNames(),
    getEurToBgnRate(),
  ]);

  // If converted, look up the linked order's order_number
  let linkedOrderNumber: string | null = null;
  if (preorder.converted_to_order_id) {
    const linkedOrder = await getOrderById(preorder.converted_to_order_id);
    linkedOrderNumber = linkedOrder?.order_number ?? null;
  }

  const statusKey = preorder.conversion_status;
  const now = new Date();
  const expiresAt = preorder.conversion_token_expires_at
    ? new Date(preorder.conversion_token_expires_at)
    : null;
  const isExpired = expiresAt ? expiresAt < now : false;
  const isPending = statusKey === 'pending' && !isExpired;

  // Personalization data
  const personalizationFields: { label: string; values: string[] }[] = [];
  if (preorder.sports?.length) {
    const items = [...preorder.sports];
    if (preorder.sport_other) items.push(preorder.sport_other);
    personalizationFields.push({ label: 'Спортове', values: items });
  }
  if (preorder.flavors?.length) {
    const items = [...preorder.flavors];
    if (preorder.flavor_other) items.push(preorder.flavor_other);
    personalizationFields.push({ label: 'Вкусове', values: items });
  }
  if (preorder.dietary?.length) {
    const items = [...preorder.dietary];
    if (preorder.dietary_other) items.push(preorder.dietary_other);
    personalizationFields.push({ label: 'Хранителен режим', values: items });
  }
  if (preorder.colors?.length) {
    personalizationFields.push({ label: 'Цветове', values: preorder.colors });
  }
  const sizes: string[] = [];
  if (preorder.size_upper) sizes.push(`Горна част: ${preorder.size_upper}`);
  if (preorder.size_lower) sizes.push(`Долна част: ${preorder.size_lower}`);
  if (sizes.length) {
    personalizationFields.push({ label: 'Размери', values: sizes });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4 flex flex-wrap items-center gap-1">
        <Link href="/account" className="hover:text-[var(--color-brand-orange)]">
          Акаунт
        </Link>
        <span>/</span>
        <Link href="/account/orders" className="hover:text-[var(--color-brand-orange)]">
          Поръчки
        </Link>
        <span>/</span>
        <span className="text-[var(--color-brand-navy)] font-medium">
          Предварителна поръчка
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          Предварителна поръчка <span className="text-base font-medium text-gray-500">#{preorder.order_id}</span>
        </h1>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PREORDER_STATUS_COLORS[statusKey]}`}
        >
          {PREORDER_STATUS_LABELS[statusKey]}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Preorder number */}
          <div>
            <span className="text-sm text-gray-500">Номер</span>
            <p className="font-medium">{preorder.order_id}</p>
          </div>

          {/* Created date */}
          <div>
            <span className="text-sm text-gray-500">Дата на създаване</span>
            <p className="font-medium">{formatDateBG(preorder.created_at)}</p>
          </div>

          {/* Box type */}
          <div>
            <span className="text-sm text-gray-500">Тип кутия</span>
            <p className="font-medium">
              {boxTypeNames[preorder.box_type] ?? preorder.box_type}
            </p>
          </div>

          {/* Price */}
          {preorder.final_price_eur != null && (
            <div>
              <span className="text-sm text-gray-500">Цена</span>
              <p className="font-semibold text-[var(--color-brand-navy)]">
                {formatPriceDual(
                  preorder.final_price_eur,
                  preorder.final_price_eur * eurToBgnRate,
                )}
              </p>
            </div>
          )}

          {/* Promo code */}
          {preorder.promo_code && (
            <div>
              <span className="text-sm text-gray-500">Промо код</span>
              <p className="font-medium">
                {preorder.promo_code}
                {preorder.discount_percent
                  ? ` (-${preorder.discount_percent}%)`
                  : ''}
              </p>
            </div>
          )}

          {/* Conversion status */}
          <div>
            <span className="text-sm text-gray-500">Статус на конверсия</span>
            <p className="mt-0.5">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PREORDER_STATUS_COLORS[statusKey]}`}
              >
                {PREORDER_STATUS_LABELS[statusKey]}
              </span>
            </p>
          </div>

          {/* Expiry date — only for pending */}
          {statusKey === 'pending' && expiresAt && (
            <div>
              <span className="text-sm text-gray-500">Изтича на</span>
              <p className="font-medium">
                {formatDateBG(preorder.conversion_token_expires_at!)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Personalization section */}
      {personalizationFields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
            Персонализация
          </h2>
          <div className="space-y-3">
            {personalizationFields.map((field) => (
              <div key={field.label}>
                <span className="text-sm text-gray-500">{field.label}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {field.values.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional notes */}
      {preorder.additional_notes && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-2">
            Допълнителни бележки
          </h2>
          <p className="text-gray-700 text-sm">{preorder.additional_notes}</p>
        </div>
      )}

      {/* Conversion CTA — pending and not expired */}
      {isPending && preorder.conversion_token && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6 text-center">
          <Link
            href={`/order/convert?token=${preorder.conversion_token}`}
            className="inline-block bg-[var(--color-brand-orange)] text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Конвертирай в поръчка
          </Link>
          {expiresAt && (
            <p className="text-sm text-gray-500 mt-2">
              Валидна до {formatDateBG(preorder.conversion_token_expires_at!)}
            </p>
          )}
        </div>
      )}

      {/* Converted state */}
      {statusKey === 'converted' && linkedOrderNumber && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <p className="text-green-800 font-medium">
            Тази предварителна поръчка е конвертирана.
          </p>
          <Link
            href={`/account/orders/${encodeURIComponent(linkedOrderNumber)}`}
            className="inline-block mt-2 text-[var(--color-brand-orange)] font-medium hover:underline"
          >
            Виж поръчка &rarr; {linkedOrderNumber}
          </Link>
        </div>
      )}

      {/* Expired state */}
      {(statusKey === 'expired' || (statusKey === 'pending' && isExpired)) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
          <p className="text-gray-600">
            Тази предварителна поръчка е изтекла и не може да бъде конвертирана.
          </p>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/account/orders?type=preorder"
        className="text-sm text-[var(--color-brand-orange)] font-medium hover:underline"
      >
        &larr; Назад към поръчки
      </Link>
    </div>
  );
}
