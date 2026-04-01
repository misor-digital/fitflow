import { requireStaff } from '@/lib/auth';
import { CUSTOMER_VIEW_ROLES } from '@/lib/auth/permissions';
import {
  getAddressesByUser,
  getSubscriptionsByUser,
  getOrdersByUser,
  getBoxTypeNames,
} from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { AddressRow, SubscriptionRow, OrderRow, OrderStatus, SubscriptionStatus } from '@/lib/supabase/types';

export const metadata: Metadata = {
  title: 'Клиент | Администрация | FitFlow',
};

function formatCustomerAddress(addr: AddressRow): { primary: string; secondary?: string } {
  if (addr.delivery_method === 'speedy_office') {
    return {
      primary: `📦 ${addr.speedy_office_name ?? 'Speedy офис'}`,
      secondary: addr.speedy_office_address ?? undefined,
    };
  }
  const parts = [addr.street_address, addr.city, addr.postal_code].filter(Boolean);
  if (addr.building_entrance) parts.push(`вх. ${addr.building_entrance}`);
  if (addr.floor) parts.push(`ет. ${addr.floor}`);
  if (addr.apartment) parts.push(`ап. ${addr.apartment}`);
  return { primary: parts.join(', ') };
}

const subscriptionStatusMap: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: { label: 'Активен', className: 'bg-green-100 text-green-700' },
  paused: { label: 'Паузиран', className: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Отказан', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Изтекъл', className: 'bg-gray-100 text-gray-500' },
};

const orderStatusMap: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Изчакваща', className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Потвърдена', className: 'bg-blue-100 text-blue-700' },
  processing: { label: 'В обработка', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: 'Изпратена', className: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Доставена', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Отказана', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'Възстановена', className: 'bg-gray-100 text-gray-500' },
};

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('bg-BG');
}

function formatPrice(eur: number | null) {
  if (eur == null) return '—';
  return `€${eur.toFixed(2)}`;
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff([...CUSTOMER_VIEW_ROLES]);
  const { id } = await params;

  const [profileResult, authResult, addresses, subscriptions, orders, boxTypeNames] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('id', id).single(),
    supabaseAdmin.auth.admin.getUserById(id),
    getAddressesByUser(id),
    getSubscriptionsByUser(id),
    getOrdersByUser(id),
    getBoxTypeNames(),
  ]);

  const profile = profileResult.data;
  if (!profile) notFound();

  const email = authResult.data?.user?.email ?? '—';
  const authCreatedAt = authResult.data?.user?.created_at;
  const hasActiveSub = subscriptions.some((s: SubscriptionRow) => s.status === 'active');
  const isStaff = profile.user_type === 'staff';
  const recentOrders = orders.slice(0, 10);

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link href="/admin/customers" className="text-sm text-gray-500 hover:text-gray-700">
          ← Назад към клиенти
        </Link>
      </div>

      {/* Section A: Customer Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-navy)] mb-3">
          {profile.full_name}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
          <p><span className="font-medium text-gray-700">Имейл:</span> {email}</p>
          <p><span className="font-medium text-gray-700">Телефон:</span> {profile.phone ?? '—'}</p>
          <p><span className="font-medium text-gray-700">Тип:</span> {profile.user_type === 'staff' ? 'Персонал' : 'Клиент'}</p>
          <p><span className="font-medium text-gray-700">Регистрация:</span> {authCreatedAt ? formatDate(authCreatedAt) : formatDate(profile.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasActiveSub && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Абонат
            </span>
          )}
          {isStaff && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Персонал{profile.staff_role ? ` (${profile.staff_role})` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Section B: Addresses */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Адреси ({addresses.length})
        </h2>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-400">Няма запазени адреси.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr: AddressRow) => {
              const formatted = formatCustomerAddress(addr);
              return (
                <div key={addr.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-gray-800">
                      {addr.label || 'Без етикет'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {addr.delivery_method === 'speedy_office' ? '📦 Speedy' : '📍 Адрес'}
                    </span>
                    {addr.is_default && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-brand-orange)] text-white">
                        По подразбиране
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{addr.full_name}</p>
                  {addr.phone && <p className="text-sm text-gray-500">{addr.phone}</p>}
                  <p className="text-sm text-gray-600 mt-1">{formatted.primary}</p>
                  {formatted.secondary && (
                    <p className="text-sm text-gray-400">{formatted.secondary}</p>
                  )}
                  {addr.delivery_notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">{addr.delivery_notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section C: Subscriptions */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Абонаменти ({subscriptions.length})
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-gray-400">Няма абонаменти.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub: SubscriptionRow) => {
              const statusInfo = subscriptionStatusMap[sub.status];
              const boxName = boxTypeNames[sub.box_type] ?? sub.box_type;
              return (
                <Link
                  key={sub.id}
                  href={`/admin/subscriptions/${sub.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[var(--color-brand-navy)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-800">{boxName}</span>
                    <StatusBadge {...statusInfo} />
                  </div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    <p>Честота: {sub.frequency === 'monthly' ? 'Месечен' : sub.frequency === 'seasonal' ? 'Сезонен' : sub.frequency}</p>
                    <p>Цена: {formatPrice(sub.current_price_eur)}</p>
                    <p>Начало: {formatDate(sub.started_at)}</p>
                    {sub.default_address_id && (
                      <p className="text-xs text-gray-400">📍 Свързан адрес</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Section D: Recent Orders */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-brand-navy)] mb-3">
          Последни поръчки
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400">Няма поръчки.</p>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Номер</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Статус</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Цена</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: OrderRow) => {
                      const statusInfo = orderStatusMap[order.status];
                      return (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="text-[var(--color-brand-navy)] hover:underline font-medium"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge {...statusInfo} />
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatPrice(order.final_price_eur)}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDate(order.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {orders.length > 10 && (
              <div className="mt-3 text-right">
                <Link
                  href={`/admin/orders?userId=${id}`}
                  className="text-sm text-[var(--color-brand-navy)] hover:underline"
                >
                  Виж всички поръчки ({orders.length}) →
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
