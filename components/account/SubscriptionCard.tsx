'use client';

import { useState } from 'react';
import type { SubscriptionWithDelivery } from '@/lib/subscription';
import {
  computeSubscriptionState,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  FREQUENCY_LABELS,
  formatSubscriptionSummary,
} from '@/lib/subscription';
import { formatDeliveryDate } from '@/lib/delivery';
import { formatPriceDual } from '@/lib/catalog';
import type { AddressRow } from '@/lib/supabase/types';
import type { PricesMap, CatalogData, PriceDisplayInfo } from '@/lib/catalog';
import PriceDisplay from '@/components/PriceDisplay';

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
  upcomingCycle: { id: string; deliveryDate: string; title: string | null } | null;
  addresses: AddressRow[];
  prices: PricesMap;
  catalogOptions: CatalogData;
  onRefresh: () => void;
}

export default function SubscriptionCard({
  subscription,
  boxTypeName,
  upcomingCycle,
  addresses,
  prices,
  catalogOptions,
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

  const state = computeSubscriptionState(subscription);
  const priceInfo = prices[subscription.box_type];

  // Build address display
  const address = addresses.find((a) => a.id === subscription.default_address_id);
  const addressDisplay = address
    ? `${address.street_address}, ${address.city} ${address.postal_code}`
    : 'Не е зададен';

  // Build price display info
  const priceDisplayInfo: PriceDisplayInfo | null = priceInfo
    ? {
        originalPriceEur: subscription.base_price_eur,
        originalPriceBgn: subscription.base_price_eur * 1.9558,
        finalPriceEur: subscription.current_price_eur,
        finalPriceBgn: subscription.current_price_eur * 1.9558,
        discountPercent: subscription.discount_percent ?? 0,
        discountAmountEur: subscription.base_price_eur - subscription.current_price_eur,
        discountAmountBgn: (subscription.base_price_eur - subscription.current_price_eur) * 1.9558,
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
              {state.isCancelled || state.isPaused || !upcomingCycle
                ? '—'
                : formatDeliveryDate(upcomingCycle.deliveryDate)}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Цена</span>
            <div className="mt-0.5">
              {priceDisplayInfo ? (
                <PriceDisplay priceInfo={priceDisplayInfo} />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {formatPriceDual(subscription.current_price_eur, subscription.current_price_eur * 1.9558)}
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
            <p className="text-sm font-medium text-gray-900 mt-0.5">{addressDisplay}</p>
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

        {/* Cancelled/expired info */}
        {(state.isCancelled || subscription.status === 'expired') && (
          <div className="px-5 pb-4">
            <p className="text-sm text-gray-500">
              {state.isCancelled && subscription.cancelled_at
                ? `Отказан на ${formatDeliveryDate(subscription.cancelled_at)}`
                : subscription.status === 'expired'
                  ? 'Изтекъл'
                  : ''}
            </p>
            {subscription.cancellation_reason && (
              <p className="text-sm text-gray-400 mt-1">
                Причина: {subscription.cancellation_reason}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(state.isActive || state.isPaused) && (
          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-2">
            {state.canEditPreferences && (
              <button
                onClick={() => setActiveModal('preferences')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                🔄 Промени предпочитания
              </button>
            )}
            {state.canEditAddress && (
              <button
                onClick={() => setActiveModal('address')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                📍 Промени адрес
              </button>
            )}
            {state.canChangeFrequency && (
              <button
                onClick={() => setActiveModal('frequency')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                ⏱ Промени честота
              </button>
            )}
            {state.canPause && (
              <button
                onClick={() => setActiveModal('pause')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                ⏸ Пауза
              </button>
            )}
            {state.canResume && (
              <button
                onClick={() => setActiveModal('resume')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                ▶️ Подновяване
              </button>
            )}
            {state.canCancel && (
              <button
                onClick={() => setActiveModal('cancel')}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
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
            <span>Поръчки от абонамента</span>
            <span className="text-xs">{showPastOrders ? '▲' : '▼'}</span>
          </button>

          {loadingOrders && (
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-400">Зареждане...</p>
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
                      <a
                        href={`/order/track?orderNumber=${order.order_number}&email=${encodeURIComponent(order.email)}`}
                        className="text-[var(--color-brand-orange)] hover:underline text-xs"
                      >
                        Проследи →
                      </a>
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
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
      {activeModal === 'resume' && (
        <ResumeModal
          subscriptionId={subscription.id}
          nextDeliveryDate={upcomingCycle?.deliveryDate ?? null}
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
      {activeModal === 'cancel' && (
        <CancelModal
          subscriptionId={subscription.id}
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
          onSuccess={handleActionSuccess}
          onClose={closeModal}
        />
      )}
    </>
  );
}
