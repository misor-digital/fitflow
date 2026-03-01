import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import {
  getOrderByNumber,
  getOrderStatusHistory,
  getBoxTypeNames,
  getEurToBgnRate,
} from '@/lib/data';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  STATUS_BG_COLORS,
  formatOrderNumber,
  formatShippingAddress,
  formatDeliveryMethodLabel,
} from '@/lib/order';
import { formatPriceDual } from '@/lib/catalog';
import { StatusTimeline } from '@/components/account/StatusTimeline';
import type { OrderStatus } from '@/lib/supabase/types';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  return {
    title: order
      ? `Поръчка ${formatOrderNumber(order.order_number)} | FitFlow`
      : 'Поръчка | FitFlow',
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const { userId } = await requireAuth();

  // Fetch order by human-readable order number
  const order = await getOrderByNumber(orderNumber);

  // Not found or not owned by this user → 404
  if (!order || order.user_id !== userId) {
    notFound();
  }

  // Fetch related data in parallel
  const [statusHistory, boxTypeNames, eurToBgnRate] = await Promise.all([
    getOrderStatusHistory(order.id),
    getBoxTypeNames(),
    getEurToBgnRate(),
  ]);

  const statusKey = order.status as OrderStatus;
  const addressLines = formatShippingAddress(order.shipping_address).split('\n');

  // Transform status history for the timeline component
  const timelineEntries = statusHistory.map((h) => ({
    fromStatus: h.from_status,
    toStatus: h.to_status,
    notes: h.notes,
    createdAt: h.created_at,
  }));

  return (
    <div>
      {/* Back link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center text-sm text-gray-500 hover:text-[var(--color-brand-navy)] mb-6 transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад към поръчки
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          {formatOrderNumber(order.order_number)}
        </h1>
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${STATUS_BG_COLORS[statusKey]} ${ORDER_STATUS_COLORS[statusKey]}`}
        >
          {statusKey === 'delivered' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {ORDER_STATUS_LABELS[statusKey] ?? order.status}
        </span>
      </div>

      {/* Order Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Детайли на поръчката</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 mb-1">Номер на поръчка</dt>
            <dd className="font-semibold text-gray-900">
              {formatOrderNumber(order.order_number)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">Тип кутия</dt>
            <dd className="font-semibold text-gray-900">
              {boxTypeNames[order.box_type] ?? order.box_type}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">Цена</dt>
            <dd className="font-semibold text-[var(--color-brand-orange)]">
              {order.final_price_eur != null
                ? formatPriceDual(order.final_price_eur, order.final_price_eur * eurToBgnRate)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 mb-1">Дата на поръчка</dt>
            <dd className="font-semibold text-gray-900">
              {new Date(order.created_at).toLocaleDateString('bg-BG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </dd>
          </div>
          {order.promo_code && (
            <div>
              <dt className="text-gray-500 mb-1">Промо код</dt>
              <dd className="font-semibold text-gray-900">
                {order.promo_code}
                {order.discount_percent
                  ? ` (-${order.discount_percent}%)`
                  : ''}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Shipping Address Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Адрес за доставка</h2>
        {order.delivery_method === 'speedy_office' && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
              📦 До офис на Speedy
            </span>
          </div>
        )}
        <div className="text-sm text-gray-700 space-y-1">
          {addressLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          {formatDeliveryMethodLabel(order.delivery_method)}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Хронология на поръчката</h2>
        {timelineEntries.length > 0 ? (
          <StatusTimeline
            statusHistory={timelineEntries}
            currentStatus={statusKey}
          />
        ) : (
          <p className="text-sm text-gray-500">Няма налична хронология.</p>
        )}
      </div>
    </div>
  );
}
