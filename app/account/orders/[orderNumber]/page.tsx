import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import {
  getOrderByNumber,
  getOrderStatusHistory,
  getBoxTypeNames,
  getEurToBgnRate,
  getDeliveryCycleById,
  getUpcomingCycle,
} from '@/lib/data';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
  ORDER_TYPE_COLORS,
  STATUS_BG_COLORS,
  formatOrderNumber,
  formatShippingAddress,
  formatDeliveryMethodLabel,
} from '@/lib/order';
import { formatPriceDual } from '@/lib/catalog';
import { StatusTimeline } from '@/components/account/StatusTimeline';
import { CancelRequestButton } from '@/components/account/CancelRequestButton';
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

  // Secondary parallel fetches (depend on order data)
  const [deliveryCycle, upcomingCycle] = await Promise.all([
    order.delivery_cycle_id ? getDeliveryCycleById(order.delivery_cycle_id) : null,
    order.order_type === 'subscription' && order.subscription_id
      ? getUpcomingCycle()
      : null,
  ]);

  const statusKey = order.status as OrderStatus;
  const addressLines = formatShippingAddress(order.shipping_address).split('\n');

  // Derived dates
  const lastUpdateDate =
    statusHistory.length > 0
      ? formatDateBG(statusHistory[statusHistory.length - 1].created_at)
      : null;
  const expectedDeliveryDate = deliveryCycle?.delivery_date
    ? formatDateBG(deliveryCycle.delivery_date)
    : null;
  const nextRenewalDate =
    order.order_type === 'subscription' && upcomingCycle?.delivery_date
      ? formatDateBG(upcomingCycle.delivery_date)
      : null;

  const canCancel = statusKey === 'pending' || statusKey === 'confirmed';

  // Transform status history for the timeline component
  const timelineEntries = statusHistory.map((h) => ({
    fromStatus: h.from_status,
    toStatus: h.to_status,
    notes: h.notes,
    createdAt: h.created_at,
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/account" className="hover:text-[var(--color-brand-navy)] transition-colors">
          Акаунт
        </Link>
        <span className="text-gray-300">&gt;</span>
        <Link
          href="/account/orders"
          className="hover:text-[var(--color-brand-navy)] transition-colors"
        >
          Поръчки
        </Link>
        <span className="text-gray-300">&gt;</span>
        <span className="text-gray-700 font-medium">
          {formatOrderNumber(order.order_number)}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
          {formatOrderNumber(order.order_number)}
          {ORDER_TYPE_LABELS[order.order_type] && (
            <span
              className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ORDER_TYPE_COLORS[order.order_type] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {ORDER_TYPE_LABELS[order.order_type]}
            </span>
          )}
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
              {formatDateBG(order.created_at)}
            </dd>
          </div>
          {lastUpdateDate && (
            <div>
              <dt className="text-gray-500 mb-1">Последна промяна</dt>
              <dd className="font-semibold text-gray-900">{lastUpdateDate}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 mb-1">Очаквана доставка</dt>
            <dd className="font-semibold text-gray-900">
              {expectedDeliveryDate ?? '—'}
            </dd>
          </div>
          {nextRenewalDate && (
            <div>
              <dt className="text-gray-500 mb-1">Следващо подновяване</dt>
              <dd className="font-semibold text-gray-900">{nextRenewalDate}</dd>
            </div>
          )}
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

      {/* Cancel request */}
      {canCancel && (
        <div className="mb-6">
          <CancelRequestButton orderNumber={order.order_number} />
        </div>
      )}

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

      {/* Tracking placeholder — shown when order is shipped */}
      {/* TODO: Integrate real tracking number from carrier API */}
      {statusKey === 'shipped' && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-purple-700 mb-6 flex items-start gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <span>
            Информация за проследяване ще се появи тук, когато пратката бъде обработена от
            куриера.
          </span>
        </div>
      )}

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
