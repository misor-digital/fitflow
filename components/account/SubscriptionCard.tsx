'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SubscriptionWithDelivery } from '@/lib/subscription';
import {
  computeSubscriptionState,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  FREQUENCY_LABELS,
  formatSubscriptionSummary,
} from '@/lib/subscription';
import { formatDeliveryDate } from '@/lib/delivery';
import { formatPriceDual, eurToBgnSync } from '@/lib/catalog';
import type { AddressRow } from '@/lib/supabase/types';
import type { PricesMap, CatalogData, PriceDisplayInfo } from '@/lib/catalog';
import PriceDisplay from '@/components/PriceDisplay';

import SubscriptionTimeline from './SubscriptionTimeline';
import PauseModal from './modals/PauseModal';
import ResumeModal from './modals/ResumeModal';
import CancelModal from './modals/CancelModal';
import PreferencesModal from './modals/PreferencesModal';
import AddressModal from './modals/AddressModal';
import FrequencyModal from './modals/FrequencyModal';

type ModalType = 'pause' | 'resume' | 'cancel' | 'preferences' | 'address' | 'frequency' | null;

interface SubscriptionCardProps {
  subscription: SubscriptionWithDelivery;
  boxTypeName: string;
  addresses: AddressRow[];
  prices: PricesMap;
  catalogOptions: CatalogData;
  eurToBgnRate: number;
  onRefresh: () => void;
}

export default function SubscriptionCard({
  subscription,
  boxTypeName,
  addresses,
  prices,
  catalogOptions,
  eurToBgnRate,
  onRefresh,
}: SubscriptionCardProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showPastOrders, setShowPastOrders] = useState(false);
  const [pastOrders, setPastOrders] = useState<Array<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    email: string;
  }> | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const state = computeSubscriptionState(subscription);
  const priceInfo = prices[subscription.box_type];

  // Build address display
  const address = addresses.find((a) => a.id === subscription.default_address_id);
  const addressLabel = address?.label || null;
  const addressDetail = address
    ? address.delivery_method === 'speedy_office'
      ? address.speedy_office_name ?? ''
      : [address.street_address, address.city, address.postal_code].filter(Boolean).join(', ')
    : null;

  // Build price display info
  const priceDisplayInfo: PriceDisplayInfo | null = priceInfo
    ? {
        originalPriceEur: subscription.base_price_eur,
        originalPriceBgn: eurToBgnSync(subscription.base_price_eur, eurToBgnRate),
        finalPriceEur: subscription.current_price_eur,
        finalPriceBgn: eurToBgnSync(subscription.current_price_eur, eurToBgnRate),
        discountPercent: subscription.discount_percent ?? 0,
        discountAmountEur: subscription.base_price_eur - subscription.current_price_eur,
        discountAmountBgn: eurToBgnSync(subscription.base_price_eur - subscription.current_price_eur, eurToBgnRate),
      }
    : null;

  // Fetch past orders for this subscription
  const loadPastOrders = async () => {
    if (pastOrders !== null) {
      setShowPastOrders(!showPastOrders);
      return;
    }
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/subscription/${subscription.id}`);
      if (res.ok) {
        const data = await res.json();
        setPastOrders(data.linkedOrders ?? []);
        setShowPastOrders(true);
      }
    } catch {
      setPastOrders([]);
      setShowPastOrders(true);
    } finally {
      setLoadingOrders(false);
    }
  };

  const closeModal = () => setActiveModal(null);

  const handleActionSuccess = () => {
    closeModal();
    onRefresh();
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-brand-navy)]">
              {formatSubscriptionSummary(subscription, { [subscription.box_type]: boxTypeName })}
            </h3>
            {state.isActive && subscription.nextDeliveryDate && (
              <p className="text-xs text-gray-500 mt-1">
                Следваща доставка: <span className="font-medium text-gray-700">{formatDeliveryDate(subscription.nextDeliveryDate)}</span>
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SUBSCRIPTION_STATUS_COLORS[subscription.status]}`}
          >
            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
          </span>
        </div>

        {/* Info Grid */}
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Следваща доставка</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {state.isCancelled || state.isPaused || !subscription.nextDeliveryDate
                ? '—'
                : formatDeliveryDate(subscription.nextDeliveryDate)}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Цена</span>
            <div className="mt-0.5">
              {priceDisplayInfo ? (
                <PriceDisplay priceInfo={priceDisplayInfo} />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {formatPriceDual(subscription.current_price_eur, eurToBgnSync(subscription.current_price_eur, eurToBgnRate))}
                </p>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Честота</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {FREQUENCY_LABELS[subscription.frequency] ?? subscription.frequency}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Адрес</span>
            {address ? (
              <div className="mt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  {addressLabel && (
                    <span className="text-sm font-bold text-[var(--color-brand-navy)]">{addressLabel}</span>
                  )}
                  {address.delivery_method === 'address' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      📍 До адрес
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      📦 Speedy офис
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{addressDetail}</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-900 mt-0.5">Не е зададен</p>
            )}
          </div>
        </div>

        {/* Promo code */}
        {subscription.promo_code && (
          <div className="px-5 pb-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
              🏷️ Промо код: {subscription.promo_code}
              {subscription.discount_percent ? ` (${subscription.discount_percent}% отстъпка)` : ''}
            </span>
          </div>
        )}

        {/* Timeline (collapsible) */}
        <div className="px-5 pb-3">
          <button
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2 rounded"
          >
            <span>{showTimeline ? '▲' : '▼'}</span>
            <span>Хронология</span>
          </button>
          {showTimeline && (
            <SubscriptionTimeline
              createdAt={subscription.created_at}
              status={subscription.status as 'active' | 'paused' | 'cancelled' | 'expired'}
              pastOrders={pastOrders}
              pausedAt={subscription.paused_at ?? null}
              cancelledAt={subscription.cancelled_at ?? null}
              nextDeliveryDate={subscription.nextDeliveryDate}
              onLoadOrders={loadPastOrders}
              loadingOrders={loadingOrders}
            />
          )}
        </div>

        {/* Cancelled/expired info */}
        {state.isCancelled && (
          <div className="mx-5 mb-4 bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">
                  Абонаментът е отказан{subscription.cancelled_at ? ` на ${formatDeliveryDate(subscription.cancelled_at)}` : ''}
                </p>
                {subscription.cancellation_reason && (
                  <p className="text-sm text-red-600 mt-1">Причина: {subscription.cancellation_reason}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {!state.isCancelled && subscription.status === 'expired' && (
          <div className="mx-5 mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-600">Абонаментът е изтекъл</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(state.isActive || state.isPaused) && (
          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-2">
            {state.canEditPreferences && (
              <button
                onClick={() => setActiveModal('preferences')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
              >
                🔄 Промени предпочитания
              </button>
            )}
            {state.canEditAddress && (
              <button
                onClick={() => setActiveModal('address')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
              >
                📍 Промени адрес
              </button>
            )}
            {state.canChangeFrequency && (
              <button
                onClick={() => setActiveModal('frequency')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
              >
                ⏱ Промени честота
              </button>
            )}
            {state.canPause && (
              <button
                onClick={() => setActiveModal('pause')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
              >
                ⏸ Пауза
              </button>
            )}
            {state.canResume && (
              <button
                onClick={() => setActiveModal('resume')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
              >
                ▶️ Подновяване
              </button>
            )}
            {state.canCancel && (
              <button
                onClick={() => setActiveModal('cancel')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)] focus:ring-offset-2"
              >
                ❌ Отказване
              </button>
            )}
          </div>
        )}

        {/* Past Orders Section (collapsible) */}
        <div className="border-t border-gray-100">
          <button
            onClick={loadPastOrders}
            className="w-full px-5 py-3 text-left text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-between"
          >
            <span>Поръчки от абонамента{pastOrders !== null ? ` (${pastOrders.length})` : ''}</span>
            <span className="text-xs">{showPastOrders ? '▲' : '▼'}</span>
          </button>

          {loadingOrders && (
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-400">Зареждане...</p>
            </div>
          )}

          {/* Inline preview: always show first 2 orders when loaded */}
          {pastOrders !== null && pastOrders.length > 0 && !showPastOrders && (
            <div className="px-5 pb-3">
              <ul className="space-y-1">
                {pastOrders.slice(0, 2).map((order) => (
                  <li key={order.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      #{order.order_number} · {new Date(order.created_at).toLocaleDateString('bg-BG')} · {order.status}
                    </span>
                    <Link
                      href={`/account/orders/${encodeURIComponent(order.order_number)}`}
                      className="text-[var(--color-brand-orange)] hover:underline text-xs"
                    >
                      Детайли →
                    </Link>
                  </li>
                ))}
              </ul>
              {pastOrders.length > 2 && (
                <button
                  onClick={() => setShowPastOrders(true)}
                  className="text-xs text-[var(--color-brand-orange)] hover:underline mt-2"
                >
                  Виж всички ({pastOrders.length})
                </button>
              )}
            </div>
          )}

          {showPastOrders && pastOrders !== null && (
            <div className="px-5 pb-4">
              {pastOrders.length === 0 ? (
                <p className="text-sm text-gray-400">Няма поръчки все още.</p>
              ) : (
                <ul className="space-y-2">
                  {pastOrders.map((order) => (
                    <li key={order.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">#{order.order_number}</span>
                        <span className="text-gray-400 ml-2">
                          {new Date(order.created_at).toLocaleDateString('bg-BG')}
                        </span>
                      </div>
                      <Link
                        href={`/account/orders/${encodeURIComponent(order.order_number)}`}
                        className="text-[var(--color-brand-orange)] hover:underline text-xs"
                      >
                        Детайли →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'pause' && (
        <PauseModal
          subscriptionId={subscription.id}
          boxType={subscription.box_type}
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
      {activeModal === 'resume' && (
        <ResumeModal
          subscriptionId={subscription.id}
          nextDeliveryDate={subscription.nextDeliveryDate}
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
      {activeModal === 'cancel' && (
        <CancelModal
          subscriptionId={subscription.id}
          boxType={subscription.box_type}
          onSuccess={handleActionSuccess}
          onPauseInstead={() => {
            setActiveModal('pause');
          }}
          onClose={closeModal}
        />
      )}
      {activeModal === 'preferences' && (
        <PreferencesModal
          subscriptionId={subscription.id}
          subscription={subscription}
          catalogOptions={catalogOptions}
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
      {activeModal === 'address' && (
        <AddressModal
          subscriptionId={subscription.id}
          currentAddressId={subscription.default_address_id}
          addresses={addresses}
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
      {activeModal === 'frequency' && (
        <FrequencyModal
          subscriptionId={subscription.id}
          currentFrequency={subscription.frequency}
          currentPriceEur={subscription.current_price_eur}
          eurToBgnRate={eurToBgnRate}
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
    </>
  );
}
