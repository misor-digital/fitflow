/**
 * Shared display pieces for admin subscription views.
 *
 * Used by the subscription detail page and the inline "Детайли" panel in the
 * subscriptions table so both render identically.
 */

import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, FREQUENCY_LABELS } from '@/lib/subscription';
import type { SubscriptionRow } from '@/lib/subscription';
import { formatDateTimeShort } from '@/lib/utils/date';
import { toTelHref } from '@/lib/utils/sanitize';
import { formatPriceEur } from '@/lib/catalog';
import { formatAddressOneLine, isSpeedyPickup } from '@/lib/order/format';
import type { AddressRow } from '@/lib/supabase/types';

// ============================================================================
// Constants
// ============================================================================

// Exhaustive by type: adding a delivery method fails compilation until it gets a badge.
const DELIVERY_METHOD_BADGES: Record<AddressRow['delivery_method'], { label: string; className: string }> = {
  address: { label: 'До адрес', className: 'bg-blue-100 text-blue-800' },
  speedy_office: { label: 'Speedy офис', className: 'bg-orange-100 text-orange-800' },
  speedy_automat: { label: 'Speedy автомат', className: 'bg-amber-100 text-amber-800' },
};

// ============================================================================
// Helpers
// ============================================================================

export function formatAddressLine(addr: AddressRow): string {
  const line = formatAddressOneLine(addr, { fallback: '—' });
  return isSpeedyPickup(addr.delivery_method) ? `📦 ${line}` : line;
}

/** Mirrors the order's shipping_address.phone; falls back to the profile phone. */
export function resolveContactPhone(
  address: AddressRow | null,
  profilePhone: string,
): { phone: string; isProfileFallback: boolean } {
  const addressPhone = address?.phone?.trim() ?? '';
  return {
    phone: addressPhone || profilePhone,
    isProfileFallback: !addressPhone && !!profilePhone,
  };
}

// ============================================================================
// Primitives
// ============================================================================

export function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export function DeliveryMethodBadge({ method }: { method: AddressRow['delivery_method'] }) {
  const badge = DELIVERY_METHOD_BADGES[method] ?? DELIVERY_METHOD_BADGES.address;
  return (
    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded ${badge.className}`}>
      {badge.label}
    </span>
  );
}

// ============================================================================
// Composite sections
// ============================================================================

interface SubscriptionCoreInfoProps {
  subscription: SubscriptionRow;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string;
  defaultAddress: AddressRow | null;
}

/**
 * Core info items (user, status, frequency, price, promo, start date, address).
 * Renders a fragment so callers can append extra items to the same grid.
 */
export function SubscriptionCoreInfo({
  subscription,
  userFirstName,
  userLastName,
  userEmail,
  userPhone,
  defaultAddress,
}: SubscriptionCoreInfoProps) {
  const contact = resolveContactPhone(defaultAddress, userPhone);

  return (
    <>
      <InfoItem label="Потребител" value={`${userFirstName} ${userLastName} (${userEmail})`} />
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
            {formatPriceEur(Number(subscription.current_price_eur))}
            {subscription.discount_percent ? (
              <span className="ml-2 text-xs text-green-600">
                (-{subscription.discount_percent}% от {formatPriceEur(Number(subscription.base_price_eur))})
              </span>
            ) : null}
          </span>
        }
      />
      {subscription.promo_code ? (
        <InfoItem
          label="Промо код"
          value={
            <span className="flex items-center gap-2 flex-wrap">
              <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded">
                {subscription.promo_code}
              </span>
              {subscription.discount_percent && (
                <span className="text-xs text-green-600">
                  -{subscription.discount_percent}%
                </span>
              )}
              <span className="text-xs text-gray-500">
                Цикли: {subscription.promo_cycles_used ?? 0}/{subscription.promo_max_cycles ?? '∞'}
              </span>
            </span>
          }
        />
      ) : (
        <InfoItem
          label="Промо код"
          value={<span className="text-gray-400 text-sm">Няма</span>}
        />
      )}
      <InfoItem label="Стартиран" value={formatDateTimeShort(subscription.started_at)} />
      <InfoItem
        label="Адрес"
        value={
          <>
            {defaultAddress ? (
              <span className="flex items-center gap-2">
                <DeliveryMethodBadge method={defaultAddress.delivery_method} />
                <span>{formatAddressLine(defaultAddress)}</span>
              </span>
            ) : (
              'Не е зададен'
            )}
            {contact.phone && (
              <span className="block text-xs text-gray-500 mt-0.5">
                Тел:{' '}
                <a href={toTelHref(contact.phone)} className="hover:underline">
                  {contact.phone}
                </a>
                {contact.isProfileFallback && <span className="text-gray-400"> (от профила)</span>}
              </span>
            )}
          </>
        }
      />
    </>
  );
}

/** Personalization tags section; renders nothing when personalization is off. */
export function SubscriptionPersonalization({ subscription }: { subscription: SubscriptionRow }) {
  if (!subscription.wants_personalization) return null;

  return (
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
  );
}
