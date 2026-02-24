'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SubscriptionRow, SubscriptionDerivedState, SubscriptionHistoryRow, SubscriptionAction } from '@/lib/subscription';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, FREQUENCY_LABELS } from '@/lib/subscription';
import { formatDeliveryDate } from '@/lib/delivery';
import type { OrderRow, AddressRow } from '@/lib/supabase/types';

// ============================================================================
// Constants
// ============================================================================

const ACTION_LABELS: Record<SubscriptionAction, string> = {
  created: 'Създаден',
  paused: 'Спрян',
  resumed: 'Подновен',
  cancelled: 'Отказан',
  expired: 'Изтекъл',
  preferences_updated: 'Предпочитания обновени',
  address_changed: 'Адрес променен',
  frequency_changed: 'Честота променена',
  order_generated: 'Поръчка генерирана',
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-blue-500',
  paused: 'bg-yellow-500',
  resumed: 'bg-green-500',
  cancelled: 'bg-red-500',
  expired: 'bg-gray-500',
  preferences_updated: 'bg-purple-500',
  address_changed: 'bg-indigo-500',
  frequency_changed: 'bg-teal-500',
  order_generated: 'bg-orange-500',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Изчаква',
  confirmed: 'Потвърдена',
  processing: 'Обработва се',
  shipped: 'Изпратена',
  delivered: 'Доставена',
  cancelled: 'Отменена',
  refunded: 'Възстановена',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// Props
// ============================================================================

interface SubscriptionDetailViewProps {
  subscription: SubscriptionRow;
  derivedState: SubscriptionDerivedState;
  history: SubscriptionHistoryRow[];
  linkedOrders: OrderRow[];
  boxTypeName: string;
  defaultAddress: AddressRow | null;
  canManage: boolean;
  userName: string;
  userEmail: string;
}

// ============================================================================
// Component
// ============================================================================

export function SubscriptionDetailView({
  subscription,
  derivedState,
  history,
  linkedOrders,
  boxTypeName,
  defaultAddress,
  canManage,
  userName,
  userEmail,
}: SubscriptionDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    action: string;
    title: string;
    message: string;
    showReasonInput?: boolean;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // ============================================================================
  // Admin Actions
  // ============================================================================

  const executeAction = async (action: string, body: Record<string, unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/subscription/${subscription.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Грешка при изпълнение на действието.`);
          return;
        }

        setSuccess(`Действието е изпълнено успешно.`);
        setTimeout(() => setSuccess(null), 3000);
        setConfirmModal(null);
        setReason('');
        router.refresh();
      } catch {
        setError('Грешка при изпълнение на действието.');
      }
    });
  };

  const handlePause = () => {
    setConfirmModal({
      action: 'pause',
      title: 'Пауза на абонамент',
      message: 'Сигурни ли сте, че искате да спрете временно този абонамент?',
    });
  };

  const handleResume = () => {
    setConfirmModal({
      action: 'resume',
      title: 'Подновяване на абонамент',
      message: 'Сигурни ли сте, че искате да подновите този абонамент?',
    });
  };

  const handleCancel = () => {
    setConfirmModal({
      action: 'cancel',
      title: 'Отказване на абонамент',
      message: 'Сигурни ли сте, че искате да откажете този абонамент? Тази операция може да бъде необратима.',
      showReasonInput: true,
    });
  };

  const handleExpire = () => {
    setConfirmModal({
      action: 'expire',
      title: 'Изтичане на абонамент',
      message: 'Сигурни ли сте, че искате да маркирате този абонамент като изтекъл?',
    });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    const body: Record<string, unknown> = { action: confirmModal.action };
    if (confirmModal.showReasonInput && reason.trim()) {
      body.reason = reason.trim();
    }
    executeAction(confirmModal.action, body);
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  function formatAddress(addr: AddressRow): string {
    const parts = [addr.street_address, addr.city, addr.postal_code];
    if (addr.building_entrance) parts.push(`вх. ${addr.building_entrance}`);
    if (addr.floor) parts.push(`ет. ${addr.floor}`);
    if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
    return parts.join(', ');
  }

  function formatDateTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString('bg-BG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ================================================================ */}
      {/* Section A: Subscription Info */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-brand-navy)]">
              {boxTypeName} — {FREQUENCY_LABELS[subscription.frequency] ?? subscription.frequency}
            </h1>
            <p className="text-sm text-gray-500 mt-1">ID: {subscription.id}</p>
          </div>
          <span
            className={`text-sm font-semibold px-4 py-2 rounded-full ${
              SUBSCRIPTION_STATUS_COLORS[subscription.status] ?? 'bg-gray-100 text-gray-800'
            }`}
          >
            {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem label="Потребител" value={`${userName} (${userEmail})`} />
          <InfoItem
            label="Статус"
            value={
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SUBSCRIPTION_STATUS_COLORS[subscription.status]}`}>
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
              </span>
            }
          />
          <InfoItem label="Честота" value={FREQUENCY_LABELS[subscription.frequency] ?? subscription.frequency} />
          <InfoItem
            label="Цена"
            value={
              <span>
                €{Number(subscription.current_price_eur).toFixed(2)}
                {subscription.discount_percent ? (
                  <span className="ml-2 text-xs text-green-600">
                    (-{subscription.discount_percent}% от €{Number(subscription.base_price_eur).toFixed(2)})
                  </span>
                ) : null}
              </span>
            }
          />
          {subscription.promo_code && (
            <InfoItem
              label="Промо код"
              value={
                <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded">
                  {subscription.promo_code}
                </span>
              }
            />
          )}
          <InfoItem label="Стартиран" value={formatDeliveryDate(subscription.started_at)} />
          <InfoItem
            label="Адрес"
            value={defaultAddress ? formatAddress(defaultAddress) : 'Не е зададен'}
          />
          {subscription.first_cycle_id && (
            <InfoItem
              label="Първи цикъл"
              value={
                <Link href={`/admin/delivery/${subscription.first_cycle_id}`} className="text-[var(--color-brand-navy)] hover:underline">
                  Виж цикъл →
                </Link>
              }
            />
          )}
          {subscription.last_delivered_cycle_id && (
            <InfoItem
              label="Последна доставка"
              value={
                <Link href={`/admin/delivery/${subscription.last_delivered_cycle_id}`} className="text-[var(--color-brand-navy)] hover:underline">
                  Виж цикъл →
                </Link>
              }
            />
          )}
          {subscription.paused_at && (
            <InfoItem label="Спрян на" value={formatDateTime(subscription.paused_at)} />
          )}
          {subscription.cancelled_at && (
            <InfoItem label="Отказан на" value={formatDateTime(subscription.cancelled_at)} />
          )}
          {subscription.cancellation_reason && (
            <InfoItem label="Причина за отказ" value={subscription.cancellation_reason} />
          )}
        </div>

        {/* Personalization Summary */}
        {subscription.wants_personalization && (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Персонализация</h3>
            <div className="flex flex-wrap gap-2">
              {subscription.sports?.map((s) => (
                <Tag key={s} label={s} color="bg-blue-100 text-blue-800" />
              ))}
              {subscription.sport_other && (
                <Tag label={`Друг: ${subscription.sport_other}`} color="bg-blue-50 text-blue-700" />
              )}
              {subscription.colors?.map((c) => (
                <Tag key={c} label={c} color="bg-pink-100 text-pink-800" />
              ))}
              {subscription.flavors?.map((f) => (
                <Tag key={f} label={f} color="bg-amber-100 text-amber-800" />
              ))}
              {subscription.flavor_other && (
                <Tag label={`Друг: ${subscription.flavor_other}`} color="bg-amber-50 text-amber-700" />
              )}
              {subscription.dietary?.map((d) => (
                <Tag key={d} label={d} color="bg-green-100 text-green-800" />
              ))}
              {subscription.dietary_other && (
                <Tag label={`Друго: ${subscription.dietary_other}`} color="bg-green-50 text-green-700" />
              )}
              {subscription.size_upper && (
                <Tag label={`Горе: ${subscription.size_upper}`} color="bg-purple-100 text-purple-800" />
              )}
              {subscription.size_lower && (
                <Tag label={`Долу: ${subscription.size_lower}`} color="bg-purple-100 text-purple-800" />
              )}
            </div>
            {subscription.additional_notes && (
              <p className="mt-2 text-sm text-gray-600 italic">
                Бележки: {subscription.additional_notes}
              </p>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Section B: Admin Actions */}
        {/* ================================================================ */}
        {canManage && (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Административни действия</h3>
            <div className="flex flex-wrap gap-2">
              {derivedState.canPause && (
                <button
                  onClick={handlePause}
                  disabled={isPending}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  ⏸ Пауза
                </button>
              )}
              {derivedState.canResume && (
                <button
                  onClick={handleResume}
                  disabled={isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  ▶ Подновяване
                </button>
              )}
              {derivedState.canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  ✕ Отказване
                </button>
              )}
              {derivedState.isActive && (
                <button
                  onClick={handleExpire}
                  disabled={isPending}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  ⏹ Изтичане
                </button>
              )}
              {derivedState.isCancelled && (
                <p className="text-sm text-gray-400 self-center">Няма налични действия за отказан абонамент.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Section C: History Timeline */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          История ({history.length})
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Няма записи в историята.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {history.map((entry) => {
                const actionKey = entry.action as SubscriptionAction;
                const isExpanded = expandedHistoryId === entry.id;

                return (
                  <div key={entry.id} className="relative pl-10">
                    {/* Dot */}
                    <div
                      className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                        ACTION_COLORS[actionKey] ?? 'bg-gray-400'
                      }`}
                    />

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">
                          {ACTION_LABELS[actionKey] ?? entry.action}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{formatDateTime(entry.created_at)}</span>
                        {entry.performed_by && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 text-xs">
                              от: {entry.performed_by === subscription.user_id ? 'Потребител' : entry.performed_by}
                            </span>
                          </>
                        )}
                      </div>

                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <button
                          onClick={() => setExpandedHistoryId(isExpanded ? null : entry.id)}
                          className="text-xs text-[var(--color-brand-navy)] hover:underline mt-1"
                        >
                          {isExpanded ? '▾ Скрий детайли' : '▸ Покажи детайли'}
                        </button>
                      )}

                      {isExpanded && entry.details && (
                        <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-x-auto text-gray-600">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Section D: Linked Orders */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-4">
          Свързани поръчки ({linkedOrders.length})
        </h2>

        {linkedOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Няма генерирани поръчки за този абонамент.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Поръчка</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Цена</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата</th>
                </tr>
              </thead>
              <tbody>
                {linkedOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders?search=${order.order_number}`}
                        className="text-[var(--color-brand-navy)] hover:underline font-medium"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {order.final_price_eur != null ? `€${Number(order.final_price_eur).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDeliveryDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Confirmation Modal */}
      {/* ================================================================ */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--color-brand-navy)] mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">{confirmModal.message}</p>

            {confirmModal.showReasonInput && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Причина (по избор)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Въведете причина..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:border-[var(--color-brand-orange)] focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setConfirmModal(null);
                  setReason('');
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                disabled={isPending}
              >
                Откажи
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-[var(--color-brand-navy)] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Изпълнява се...' : 'Потвърди'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{typeof value === 'string' ? value : value}</dd>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
