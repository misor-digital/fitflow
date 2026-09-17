'use client';

import { useState, useCallback, useRef, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { CustomerWithStats } from '@/lib/supabase/types';
import { formatDateShort } from '@/lib/utils/date';

interface CustomersTableProps {
  customers: CustomerWithStats[];
  total: number;
  currentPage: number;
  perPage: number;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialSubscriber?: string;
  initialSubscription?: string;
  initialMinOrders?: string;
}

type BoolFilter = '' | 'true' | 'false';

export function CustomersTable({
  customers,
  total,
  currentPage,
  perPage,
  initialName = '',
  initialEmail = '',
  initialPhone = '',
  initialSubscriber = '',
  initialSubscription = '',
  initialMinOrders = '',
}: CustomersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  // All filters (server-side, debounced URL navigation)
  const [nameFilter, setNameFilter] = useState(initialName);
  const [emailFilter, setEmailFilter] = useState(initialEmail);
  const [phoneFilter, setPhoneFilter] = useState(initialPhone);
  const [subscriberFilter, setSubscriberFilter] = useState<BoolFilter>(initialSubscriber as BoolFilter);
  const [subscriptionFilter, setSubscriptionFilter] = useState<BoolFilter>(initialSubscription as BoolFilter);
  const [minOrders, setMinOrders] = useState(initialMinOrders);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  const navigateWithFilters = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('page'); // Reset to page 1 on filter change
      for (const [k, v] of Object.entries(overrides)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      const qs = p.toString();
      startTransition(() => {
        router.push(`${pathname}${qs ? `?${qs}` : ''}`);
      });
    },
    [router, pathname, searchParams],
  );

  const debouncedNavigate = useCallback(
    (overrides: Record<string, string>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => navigateWithFilters(overrides), 400);
    },
    [navigateWithFilters],
  );

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleNameChange = (v: string) => { setNameFilter(v); debouncedNavigate({ search: v }); };
  const handleEmailChange = (v: string) => { setEmailFilter(v); debouncedNavigate({ email: v }); };
  const handlePhoneChange = (v: string) => { setPhoneFilter(v); debouncedNavigate({ phone: v }); };
  const handleSubscriberChange = (v: BoolFilter) => { setSubscriberFilter(v); navigateWithFilters({ subscriber: v }); };
  const handleSubscriptionChange = (v: BoolFilter) => { setSubscriptionFilter(v); navigateWithFilters({ subscription: v }); };
  const handleMinOrdersChange = (v: string) => { setMinOrders(v); debouncedNavigate({ minOrders: v }); };

  const hasAnyFilter = nameFilter || emailFilter || phoneFilter || subscriberFilter || subscriptionFilter || minOrders;

  const clearAllFilters = () => {
    setNameFilter('');
    setEmailFilter('');
    setPhoneFilter('');
    setSubscriberFilter('');
    setSubscriptionFilter('');
    setMinOrders('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div>
      {/* Results summary + clear button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Показване на {start}–{end} от {total} клиенти
          {hasAnyFilter ? ' · филтрирано' : ''}
        </p>
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
          >
            Изчисти филтрите
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-3 border-[var(--color-brand-navy)] border-t-transparent rounded-full" />
          </div>
        )}
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
                  <div className="relative">
                    <input
                      type="text"
                      value={nameFilter}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Филтър..."
                      className="w-full border border-gray-200 rounded px-2 py-1 pr-6 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                    />
                    {nameFilter && (
                      <button onClick={() => handleNameChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={emailFilter}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="Филтър..."
                      className="w-full border border-gray-200 rounded px-2 py-1 pr-6 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                    />
                    {emailFilter && (
                      <button onClick={() => handleEmailChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </div>
                </th>
                <th className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={phoneFilter}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Филтър..."
                      className="w-full border border-gray-200 rounded px-2 py-1 pr-6 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                    />
                    {phoneFilter && (
                      <button onClick={() => handlePhoneChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </div>
                </th>
                <th className="px-4 py-2">
                  <select
                    value={subscriberFilter}
                    onChange={(e) => handleSubscriberChange(e.target.value as BoolFilter)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                  >
                    <option value="">Всички</option>
                    <option value="true">Да</option>
                    <option value="false">Не</option>
                  </select>
                </th>
                <th className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="number"
                      value={minOrders}
                      onChange={(e) => handleMinOrdersChange(e.target.value)}
                      placeholder="Мин."
                      min="0"
                      className="w-full border border-gray-200 rounded px-2 py-1 pr-6 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-navy)]"
                    />
                    {minOrders && (
                      <button onClick={() => handleMinOrdersChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </div>
                </th>
                <th className="px-4 py-2">
                  <select
                    value={subscriptionFilter}
                    onChange={(e) => handleSubscriptionChange(e.target.value as BoolFilter)}
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
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Няма съвпадения за зададените филтри.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
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
