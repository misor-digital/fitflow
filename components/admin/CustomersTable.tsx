'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CustomerWithStats } from '@/lib/supabase/types';
import { formatDateShort } from '@/lib/utils/date';

interface CustomersTableProps {
  customers: CustomerWithStats[];
  total: number;
  currentPage: number;
  perPage: number;
}

type BoolFilter = '' | 'true' | 'false';

export function CustomersTable({
  customers,
  total,
  currentPage,
  perPage,
}: CustomersTableProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  // Column filters (client-side on current page)
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [subscriberFilter, setSubscriberFilter] = useState<BoolFilter>('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<BoolFilter>('');
  const [minOrders, setMinOrders] = useState('');

  const filtered = useMemo(() => {
    let result = customers;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q),
      );
    }
    if (emailFilter) {
      const q = emailFilter.toLowerCase();
      result = result.filter((c) => c.email.toLowerCase().includes(q));
    }
    if (phoneFilter) {
      result = result.filter((c) => (c.phone ?? '').includes(phoneFilter));
    }
    if (subscriberFilter === 'true') {
      result = result.filter((c) => c.is_subscriber);
    } else if (subscriberFilter === 'false') {
      result = result.filter((c) => !c.is_subscriber);
    }
    if (subscriptionFilter === 'true') {
      result = result.filter((c) => c.has_active_subscription);
    } else if (subscriptionFilter === 'false') {
      result = result.filter((c) => !c.has_active_subscription);
    }
    if (minOrders) {
      const n = parseInt(minOrders, 10);
      if (!isNaN(n)) result = result.filter((c) => c.order_count >= n);
    }

    return result;
  }, [customers, nameFilter, emailFilter, phoneFilter, subscriberFilter, subscriptionFilter, minOrders]);

  const hasFilters = nameFilter || emailFilter || phoneFilter || subscriberFilter || subscriptionFilter || minOrders;

  return (
    <div>
      {/* Results summary */}
      <p className="text-sm text-gray-500 mb-3">
        Показване на {start}–{end} от {total} клиенти
        {hasFilters ? ` (${filtered.length} съвпадения на страницата)` : ''}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Име</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Имейл</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Телефон</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Абонат</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Поръчки</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Абонамент</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Последна поръчка</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Регистрация</th>
              </tr>
              {/* Filter row */}
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-2">
                  <input
                    type="text"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Филтър..."
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    type="text"
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    placeholder="Филтър..."
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    type="text"
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                    placeholder="Филтър..."
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  />
                </th>
                <th className="px-4 py-2">
                  <select
                    value={subscriberFilter}
                    onChange={(e) => setSubscriberFilter(e.target.value as BoolFilter)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  >
                    <option value="">Всички</option>
                    <option value="true">Да</option>
                    <option value="false">Не</option>
                  </select>
                </th>
                <th className="px-4 py-2">
                  <input
                    type="number"
                    value={minOrders}
                    onChange={(e) => setMinOrders(e.target.value)}
                    placeholder="Мин."
                    min="0"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  />
                </th>
                <th className="px-4 py-2">
                  <select
                    value={subscriptionFilter}
                    onChange={(e) => setSubscriptionFilter(e.target.value as BoolFilter)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  >
                    <option value="">Всички</option>
                    <option value="true">Активен</option>
                    <option value="false">Няма</option>
                  </select>
                </th>
                <th className="px-4 py-2" />
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Няма съвпадения за зададените филтри.
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-[var(--color-brand-navy)] hover:underline font-medium"
                      >
                        {customer.first_name} {customer.last_name}
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {customer.email || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {customer.phone || '—'}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.is_subscriber
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {customer.is_subscriber ? 'Да' : 'Не'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {customer.order_count}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.has_active_subscription
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {customer.has_active_subscription ? 'Активен' : 'Няма'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-500">
                      {customer.last_order_date
                        ? formatDateShort(customer.last_order_date)
                        : '—'}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDateShort(customer.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
